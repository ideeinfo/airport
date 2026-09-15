#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import quote


def clean(value: Any, fallback: str = "") -> str:
    text = str(value or fallback).strip()
    return re.sub(r"\s+", " ", text)


def value_from_psets(psets: dict[str, Any], names: tuple[str, ...]) -> str:
    wanted = {name.casefold() for name in names}
    for group in psets.values():
        if not isinstance(group, dict):
            continue
        for key, value in group.items():
            if key.casefold() in wanted and not isinstance(value, dict):
                return clean(value)
    return ""


def placement_xyz(entity: Any) -> list[float] | None:
    try:
        import ifcopenshell.util.placement

        matrix = ifcopenshell.util.placement.get_local_placement(entity.ObjectPlacement)
        return [round(float(matrix[0][3]), 3), round(float(matrix[1][3]), 3), round(float(matrix[2][3]), 3)]
    except (AttributeError, TypeError, ValueError):
        return None


def scan_drawings(root: Path) -> list[dict[str, Any]]:
    items = []
    for index, path in enumerate(sorted(root.rglob("*.pdf")), start=1):
        relative = path.relative_to(root).as_posix()
        discipline = relative.split("/", 1)[0] if "/" in relative else "未分类"
        items.append(
            {
                "id": f"DRW-{index:04d}",
                "title": path.stem,
                "discipline": discipline,
                "relative_path": relative,
                "ifc_room": "T-BE-B1-M18" in path.stem,
                "url": f"/api/drawings/file/{quote(relative)}",
                "version": "原始交付版",
                "source": "部分机房图纸",
            }
        )
    return items


def extract_corpus(root: Path) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for path in sorted(root.glob("*.pdf")):
        try:
            from pypdf import PdfReader

            pages = [page.extract_text() or "" for page in PdfReader(path).pages]
        except ImportError:
            result = subprocess.run(
                ["pdftotext", "-layout", str(path), "-"],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            pages = result.stdout.decode("utf-8", errors="ignore").split("\f")
        for page_no, page_text in enumerate(pages, start=1):
            text = clean(page_text)
            if not text:
                continue
            for start in range(0, len(text), 900):
                content = text[start : start + 1100]
                if len(content) < 40:
                    continue
                chunks.append(
                    {
                        "id": f"{path.stem}-{page_no}-{start}",
                        "document": path.name,
                        "page": page_no,
                        "content": content,
                    }
                )
    return chunks


def build_ifc(ifc_path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any], list[dict[str, Any]]]:
    import ifcopenshell
    import ifcopenshell.util.element

    model = ifcopenshell.open(str(ifc_path))
    products = list(model.by_type("IfcDistributionElement"))
    product_ids = {product.id() for product in products}
    for product in model.by_type("IfcBuildingElementProxy"):
        label = " ".join(clean(getattr(product, key, None)) for key in ("Name", "ObjectType", "Tag"))
        if re.search(r"\bAHU-[0-9A-Z-]+\b", label, re.IGNORECASE) and product.id() not in product_ids:
            products.append(product)
            product_ids.add(product.id())
    if not products:
        products = [item for item in model.by_type("IfcElement") if not item.is_a("IfcFeatureElement")]

    system_by_id: dict[int, list[str]] = defaultdict(list)
    for relation in model.by_type("IfcRelAssignsToGroup"):
        group = getattr(relation, "RelatingGroup", None)
        if group and group.is_a("IfcSystem"):
            system_name = clean(getattr(group, "Name", None), group.GlobalId)
            for item in getattr(relation, "RelatedObjects", ()) or ():
                system_by_id[item.id()].append(system_name)

    codes: Counter[str] = Counter()
    assets: list[dict[str, Any]] = []
    entity_to_code: dict[int, str] = {}
    candidate_ahu_index: int | None = None
    for product in products:
        name = clean(getattr(product, "Name", None), product.is_a())
        identity = " ".join(clean(getattr(product, key, None)) for key in ("Name", "ObjectType", "Tag"))
        ahu_match = re.search(r"\bAHU-[0-9A-Z-]+\b", identity, re.IGNORECASE)
        raw_code = ahu_match.group(0).upper() if ahu_match else clean(getattr(product, "Tag", None) or name or product.GlobalId)
        raw_code = re.sub(r"[^0-9A-Za-z_\-.\u4e00-\u9fff]+", "-", raw_code).strip("-")[:96] or product.GlobalId
        codes[raw_code] += 1
        asset_code = raw_code if codes[raw_code] == 1 else f"{raw_code}-{codes[raw_code]}"
        psets = ifcopenshell.util.element.get_psets(product)
        container = ifcopenshell.util.element.get_container(product)
        element_type = ifcopenshell.util.element.get_type(product)
        system_names = system_by_id.get(product.id(), [])
        record = {
            "asset_code": asset_code,
            "ifc_global_id": product.GlobalId,
            "revit_id": value_from_psets(psets, ("Revit ID", "ElementId", "元素ID")),
            "name": name,
            "ifc_class": product.is_a(),
            "model": value_from_psets(psets, ("Model", "型号", "Type Mark", "类型标记")),
            "manufacturer": value_from_psets(psets, ("Manufacturer", "厂家", "制造商")),
            "serial_number": value_from_psets(psets, ("SerialNumber", "Serial Number", "序列号")),
            "location": clean(getattr(container, "Name", None), "AR_-7.000 / B1"),
            "floor_id": clean(getattr(container, "GlobalId", None), "AR_-7.000"),
            "system": " / ".join(system_names),
            "service_scope": "待从系统拓扑与房间表确认",
            "type_name": clean(getattr(element_type, "Name", None)),
            "placement": placement_xyz(product),
            "data_status": "IFC已解析",
        }
        entity_to_code[product.id()] = asset_code
        assets.append(record)
        hint = f"{name} {product.is_a()} {raw_code}".casefold()
        if asset_code.upper() == "AHU-0B2-04":
            candidate_ahu_index = len(assets) - 1
        elif candidate_ahu_index is None and any(token in hint for token in ("ahu", "空调机组", "airhandling", "unitaryequipment")):
            candidate_ahu_index = len(assets) - 1

    if candidate_ahu_index is not None:
        old_code = assets[candidate_ahu_index]["asset_code"]
        assets[candidate_ahu_index].update(
            {
                "asset_code": "AHU-0B2-04",
                "name": assets[candidate_ahu_index]["name"] or "组合式空调机组",
                "location": "RM-B1-M18 / T-BE-B1-M18空调机房",
                "system": "SA 94 / RA 93 / FA 58",
                "service_scope": "B1东段 / L1到达厅 / L2候机区",
                "data_status": "IFC已解析 + Demo业务编码",
            }
        )
        for entity_id, code in list(entity_to_code.items()):
            if code == old_code:
                entity_to_code[entity_id] = "AHU-0B2-04"

    rooms: list[dict[str, Any]] = []
    for index, space in enumerate(model.by_type("IfcSpace"), start=1):
        name = clean(getattr(space, "LongName", None) or getattr(space, "Name", None), f"空间{index}")
        rooms.append(
            {
                "room_id": clean(getattr(space, "Tag", None), space.GlobalId),
                "room_name": name,
                "floor_id": "AR_-7.000 / B1",
                "boundary": {"type": "ifc-placement", "origin": placement_xyz(space)},
                "zone_code": "",
                "ifc_global_id": space.GlobalId,
                "source": "IFC",
            }
        )

    demo_room = {
        "room_id": "RM-B1-M18",
        "room_name": "T-BE-B1-M18 空调机房",
        "floor_id": "AR_-7.000 / B1",
        "boundary": {"type": "demo-polygon", "code": "Demo-Polygon-B1-M18", "status": "待IFC空间边界/图纸轮廓校核"},
        "zone_code": "HET-T2-B1-M18",
        "ifc_global_id": next((room["ifc_global_id"] for room in rooms if "空调" in room["room_name"]), ""),
        "source": "IFC空间 + Demo补充",
        "service_areas": ["SA-ZONE-B1-02", "SA-ZONE-L1-05", "SA-ZONE-L2-03"],
    }
    rooms.insert(0, demo_room)

    points = []
    for code, kind, unit, address, rule in [
        ("SAT", "AI", "℃", "AI-04-01", "> 19.0℃ 持续10分钟"),
        ("RAT", "AI", "℃", "AI-04-02", "> 27.0℃"),
        ("SF_CMD", "DO", "bool", "DO-04-01", "指令/状态不一致"),
        ("SF_STS", "DI", "bool", "DI-04-01", "停机超过5分钟"),
        ("FIL_DP", "AI", "Pa", "AI-04-03", "> 250Pa 预警；> 320Pa 报警"),
        ("CHWV_CMD", "AO", "%", "AO-04-01", "> 95% 持续30分钟"),
        ("ALM", "DI", "bool", "DI-04-02", "值=1报警"),
    ]:
        points.append(
            {
                "point_code": f"AHU-0B2-04.{code}",
                "asset_code": "AHU-0B2-04",
                "io_type": kind,
                "unit": unit,
                "controller": "DDC-B1-M18-01",
                "address": address,
                "alarm_rule": rule,
                "source": "Demo自动生成",
            }
        )

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    code_by_guid = {asset["ifc_global_id"]: asset["asset_code"] for asset in assets}
    for asset in assets:
        nodes.append(
            {
                "id": f"asset:{asset['asset_code']}",
                "label": asset["asset_code"],
                "kind": "设备",
                "ifc_class": asset["ifc_class"],
                "properties": asset,
            }
        )
        edges.append({"source": f"asset:{asset['asset_code']}", "target": f"space:{asset['location']}", "type": "LOCATED_IN"})
        nodes.append({"id": f"space:{asset['location']}", "label": asset["location"], "kind": "空间"})
        for system_name in [item.strip() for item in asset["system"].split("/") if item.strip()]:
            nodes.append({"id": f"system:{system_name}", "label": system_name, "kind": "系统"})
            edges.append({"source": f"asset:{asset['asset_code']}", "target": f"system:{system_name}", "type": "PART_OF_SYSTEM"})
        if asset["type_name"]:
            type_id = f"type:{asset['ifc_class']}:{asset['type_name']}"
            nodes.append({"id": type_id, "label": asset["type_name"], "kind": "设备类型"})
            edges.append({"source": f"asset:{asset['asset_code']}", "target": type_id, "type": "INSTANCE_OF"})

    for relation in model.by_type("IfcRelConnectsElements"):
        source = getattr(relation, "RelatingElement", None)
        target = getattr(relation, "RelatedElement", None)
        source_code = code_by_guid.get(getattr(source, "GlobalId", ""))
        target_code = code_by_guid.get(getattr(target, "GlobalId", ""))
        if source_code and target_code:
            edges.append({"source": f"asset:{source_code}", "target": f"asset:{target_code}", "type": "CONNECTED_TO", "ifc_relation": relation.GlobalId})

    port_owner: dict[int, str] = {}
    for relation in model.by_type("IfcRelConnectsPortToElement"):
        port = getattr(relation, "RelatingPort", None)
        element = getattr(relation, "RelatedElement", None)
        code = code_by_guid.get(getattr(element, "GlobalId", ""))
        if port and code:
            port_owner[port.id()] = code
    for relation in model.by_type("IfcRelConnectsPorts"):
        source_code = port_owner.get(getattr(getattr(relation, "RelatingPort", None), "id", lambda: -1)())
        target_code = port_owner.get(getattr(getattr(relation, "RelatedPort", None), "id", lambda: -1)())
        if source_code and target_code and source_code != target_code:
            edges.append({"source": f"asset:{source_code}", "target": f"asset:{target_code}", "type": "CONNECTED_TO", "ifc_relation": relation.GlobalId})

    service_areas = [
        ("SA-ZONE-B1-02", "B1公共区东段", "1,860 m²"),
        ("SA-ZONE-L1-05", "L1到达厅东区", "3,240 m²"),
        ("SA-ZONE-L2-03", "L2候机区中段", "2,780 m²"),
    ]
    nodes.append({"id": "room:RM-B1-M18", "label": "RM-B1-M18", "kind": "房间", "properties": demo_room})
    edges.append({"source": "asset:AHU-0B2-04", "target": "room:RM-B1-M18", "type": "LOCATED_IN", "source_kind": "demo-confirmed"})
    for zone_code, name, area in service_areas:
        nodes.append({"id": f"zone:{zone_code}", "label": name, "kind": "服务区域", "properties": {"zone_code": zone_code, "area": area}})
        edges.append({"source": "asset:AHU-0B2-04", "target": f"zone:{zone_code}", "type": "SERVES", "source_kind": "demo-generated"})
        edges.append({"source": f"room:RM-B1-M18", "target": f"zone:{zone_code}", "type": "SUPPLIES", "source_kind": "demo-generated"})
    for point in points:
        nodes.append({"id": f"point:{point['point_code']}", "label": point["point_code"], "kind": "点位", "properties": point})
        edges.append({"source": "asset:AHU-0B2-04", "target": f"point:{point['point_code']}", "type": "HAS_POINT"})

    unique_nodes = {node["id"]: node for node in nodes}
    unique_edges = {
        (edge["source"], edge["target"], edge["type"]): edge
        for edge in edges
        if edge["source"] in unique_nodes and edge["target"] in unique_nodes
    }
    graph = {
        "meta": {
            "ifc_schema": model.schema,
            "ifc_product_count": len(model.by_type("IfcProduct")),
            "asset_count": len(assets),
            "room_count": len(rooms),
            "point_count": len(points),
            "service_area_count": len(service_areas),
            "data_status": "IFC解析数据 + 明确标注的Demo补充数据",
        },
        "nodes": list(unique_nodes.values()),
        "edges": list(unique_edges.values()),
    }
    return assets, rooms, graph, points


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Hohhot airport demo data from IFC, drawings and documents")
    parser.add_argument("--ifc", required=True, type=Path)
    parser.add_argument("--drawings", required=True, type=Path)
    parser.add_argument("--documents", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    for path in (args.ifc, args.drawings, args.documents):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")

    assets, rooms, graph, points = build_ifc(args.ifc)
    drawings = scan_drawings(args.drawings)
    corpus = extract_corpus(args.documents)
    write_json(args.output / "assets.json", assets)
    write_json(args.output / "rooms.json", rooms)
    write_json(args.output / "graph.json", graph)
    write_json(args.output / "points.json", points)
    write_json(args.output / "drawings.json", drawings)
    write_json(args.output / "corpus.json", corpus)
    print(
        json.dumps(
            {
                "assets": len(assets),
                "rooms": len(rooms),
                "graph_nodes": len(graph["nodes"]),
                "graph_edges": len(graph["edges"]),
                "points": len(points),
                "drawings": len(drawings),
                "document_chunks": len(corpus),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
