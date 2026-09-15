#!/usr/bin/env python3
"""Convert the airport IFC into a browser-friendly GLB preview.

The converter deliberately has no dependencies beyond IfcOpenShell and NumPy so
it can run inside the existing BIM Python environment on 192.168.2.153.
"""

from __future__ import annotations

import argparse
import json
import multiprocessing
import struct
from collections import defaultdict
from pathlib import Path

import ifcopenshell
import ifcopenshell.geom
import numpy as np

from model_optimization import index_storage


MATERIALS = {
    "duct": (0.36, 0.61, 0.75, 1.0),
    "pipe": (0.28, 0.55, 0.72, 1.0),
    "equipment": (0.84, 0.61, 0.22, 1.0),
    "fitting": (0.49, 0.68, 0.76, 1.0),
    "terminal": (0.35, 0.63, 0.48, 1.0),
    "structure": (0.72, 0.76, 0.77, 1.0),
}


def classify(product: object) -> str:
    ifc_class = product.is_a()
    label = f"{getattr(product, 'Name', '')} {getattr(product, 'ObjectType', '')}".lower()
    if "duct" in label or "风管" in label:
        return "duct"
    if "pipe" in label or "水管" in label or "管道" in label:
        return "pipe"
    if ifc_class in {"IfcFlowFitting", "IfcJunctionBox"}:
        return "fitting"
    if ifc_class in {"IfcFlowTerminal", "IfcAirTerminal"}:
        return "terminal"
    if ifc_class in {
        "IfcEnergyConversionDevice",
        "IfcFlowController",
        "IfcFlowMovingDevice",
        "IfcFlowStorageDevice",
        "IfcFlowTreatmentDevice",
        "IfcUnitaryEquipment",
    }:
        return "equipment"
    if ifc_class == "IfcFlowSegment":
        return "pipe"
    return "structure"


def pad4(data: bytes, fill: bytes = b"\x00") -> bytes:
    return data + fill * ((-len(data)) % 4)


def convert(ifc_path: Path, output_path: Path, workers: int) -> dict[str, object]:
    model = ifcopenshell.open(str(ifc_path))
    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)
    iterator = ifcopenshell.geom.iterator(settings, model, workers)
    if not iterator.initialize():
        raise RuntimeError("IFC geometry iterator could not be initialized")

    elements: list[dict[str, object]] = []
    element_counts: dict[str, int] = defaultdict(int)
    skipped = 0

    while True:
        shape = iterator.get()
        product = model.by_id(shape.id)
        if product and product.is_a() not in {"IfcSpace", "IfcOpeningElement", "IfcAnnotation"}:
            verts = np.asarray(shape.geometry.verts, dtype=np.float32).reshape((-1, 3))
            tris = np.asarray(shape.geometry.faces, dtype=np.uint32).reshape((-1, 3))
            if len(verts) and len(tris):
                category = classify(product)
                elements.append({
                    "vertices": verts,
                    "faces": tris,
                    "category": category,
                    "ifc_global_id": product.GlobalId,
                    "ifc_class": product.is_a(),
                    "name": str(getattr(product, "Name", None) or product.GlobalId),
                })
                element_counts[category] += 1
            else:
                skipped += 1
        if not iterator.next():
            break

    if not elements:
        raise RuntimeError("No renderable IFC geometry was produced")

    all_min = np.min(np.stack([element["vertices"].min(axis=0) for element in elements]), axis=0)
    all_max = np.max(np.stack([element["vertices"].max(axis=0) for element in elements]), axis=0)
    center = (all_min + all_max) / 2.0
    for element in elements:
        element["vertices"] = (element["vertices"] - center) / 1000.0

    binary = bytearray()
    buffer_views: list[dict[str, object]] = []
    accessors: list[dict[str, object]] = []
    meshes: list[dict[str, object]] = []
    nodes: list[dict[str, object]] = []
    gltf_materials: list[dict[str, object]] = []

    material_by_category: dict[str, int] = {}
    for category, color in MATERIALS.items():
        if not element_counts.get(category):
            continue
        material_by_category[category] = len(gltf_materials)
        gltf_materials.append({
            "name": category,
            "pbrMetallicRoughness": {
                "baseColorFactor": color,
                "metallicFactor": 0.05,
                "roughnessFactor": 0.72,
            },
            "doubleSided": True,
        })

    for element in elements:
        category = str(element["category"])
        position = np.ascontiguousarray(element["vertices"], dtype="<f4")
        index_dtype, index_component_type = index_storage(len(position))
        indices = np.ascontiguousarray(element["faces"].reshape(-1), dtype=index_dtype)

        position_offset = len(binary)
        binary.extend(position.tobytes())
        binary.extend(b"\x00" * ((-len(binary)) % 4))
        position_view = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": position_offset, "byteLength": position.nbytes, "target": 34962})
        position_accessor = len(accessors)
        accessors.append({
            "bufferView": position_view,
            "componentType": 5126,
            "count": len(position),
            "type": "VEC3",
            "min": position.min(axis=0).astype(float).tolist(),
            "max": position.max(axis=0).astype(float).tolist(),
        })

        index_offset = len(binary)
        binary.extend(indices.tobytes())
        binary.extend(b"\x00" * ((-len(binary)) % 4))
        index_view = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": index_offset, "byteLength": indices.nbytes, "target": 34963})
        index_accessor = len(accessors)
        accessors.append({
            "bufferView": index_view,
            "componentType": index_component_type,
            "count": len(indices),
            "type": "SCALAR",
            "min": [int(indices.min())],
            "max": [int(indices.max())],
        })

        mesh_index = len(meshes)
        meshes.append({
            "name": str(element["name"]),
            "primitives": [{"attributes": {"POSITION": position_accessor}, "indices": index_accessor, "material": material_by_category[category]}],
        })
        nodes.append({
            "name": str(element["name"]),
            "mesh": mesh_index,
            "extras": {
                "ifcGlobalId": str(element["ifc_global_id"]),
                "ifcClass": str(element["ifc_class"]),
                "category": category,
            },
        })

    stats = {
        "ifcSchema": model.schema,
        "ifcProducts": len(model.by_type("IfcProduct")),
        "renderedElements": int(sum(element_counts.values())),
        "triangles": int(sum(len(element["faces"]) for element in elements)),
        "categories": dict(element_counts),
        "source": ifc_path.name,
        "skipped": skipped,
    }
    root_index = len(nodes)
    nodes.append({"name": "Airport MEP IFC", "children": list(range(root_index)), "extras": stats})
    gltf = {
        "asset": {"version": "2.0", "generator": "airport-ai-ops IfcOpenShell converter"},
        "scene": 0,
        "scenes": [{"nodes": [root_index]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": gltf_materials,
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
    }

    json_chunk = pad4(json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad4(bytes(binary))
    total_length = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as stream:
        stream.write(struct.pack("<4sII", b"glTF", 2, total_length))
        stream.write(struct.pack("<I4s", len(json_chunk), b"JSON"))
        stream.write(json_chunk)
        stream.write(struct.pack("<I4s", len(bin_chunk), b"BIN\x00"))
        stream.write(bin_chunk)
    stats["outputBytes"] = output_path.stat().st_size
    return stats


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("ifc", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--workers", type=int, default=max(1, multiprocessing.cpu_count() - 1))
    args = parser.parse_args()
    print(json.dumps(convert(args.ifc, args.output, args.workers), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
