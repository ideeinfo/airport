from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote

from .config import settings


def read_json(name: str, default: Any) -> Any:
    path = settings.data_root / name
    if not path.is_file():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def safe_drawing_path(relative_path: str) -> Path:
    candidate = (settings.drawings_root / relative_path).resolve()
    root = settings.drawings_root.resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError("drawing path escapes configured root")
    if not candidate.is_file() or candidate.suffix.lower() != ".pdf":
        raise FileNotFoundError(relative_path)
    return candidate


def safe_document_path(relative_path: str) -> Path:
    candidate = (settings.documents_root / relative_path).resolve()
    root = settings.documents_root.resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError("document path escapes configured root")
    if candidate.name == "消防（土建航站楼火自报243）.pdf":
        raise FileNotFoundError(relative_path)
    if not candidate.is_file() or candidate.suffix.lower() != ".pdf":
        raise FileNotFoundError(relative_path)
    return candidate


def scan_drawings() -> list[dict[str, Any]]:
    indexed = read_json("drawings.json", [])
    if indexed:
        return indexed
    if not settings.drawings_root.is_dir():
        return []
    records: list[dict[str, Any]] = []
    for index, path in enumerate(sorted(settings.drawings_root.rglob("*.pdf")), start=1):
        relative = path.relative_to(settings.drawings_root).as_posix()
        discipline = relative.split("/", 1)[0] if "/" in relative else "未分类"
        stem = path.stem
        records.append(
            {
                "id": f"DRW-{index:04d}",
                "title": stem,
                "discipline": discipline,
                "relative_path": relative,
                "ifc_room": "T-BE-B1-M18" in stem,
                "url": f"/api/drawings/file/{quote(relative)}",
            }
        )
    return records


def search_records(records: list[dict[str, Any]], query: str, fields: tuple[str, ...]) -> list[dict[str, Any]]:
    tokens = [token.casefold() for token in re.findall(r"[\w\-]+", query, re.UNICODE) if token.strip()]
    if not tokens:
        return records
    scored: list[tuple[int, dict[str, Any]]] = []
    for record in records:
        haystack = " ".join(str(record.get(field, "")) for field in fields).casefold()
        score = sum(3 if token in haystack else 0 for token in tokens)
        if record.get("ifc_room") and any("m18" in token or "空调机房" in token for token in tokens):
            score += 5
        if score:
            scored.append((score, record))
    return [record for _, record in sorted(scored, key=lambda item: (-item[0], item[1].get("title", "")))]


def build_drawing_tree(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    order = ["建筑", "暖通", "消防", "电气", "给排水"]
    grouped: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        grouped.setdefault(record["discipline"], []).append(record)
    disciplines = []
    for discipline in order + sorted(set(grouped) - set(order)):
        items = grouped.get(discipline, [])
        if not items:
            continue
        disciplines.append({"name": discipline, "count": len(items), "node_type": "discipline", "children": [], "items": items})
    if not disciplines:
        return []
    return [
        {
            "name": "T-BE-B1-M18空调机房",
            "count": len(records),
            "highlight": True,
            "node_type": "space",
            "children": disciplines,
            "items": records,
        }
    ]
