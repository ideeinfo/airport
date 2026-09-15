from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any
from uuid import uuid4

from .config import settings


_HISTORY_FILENAME = "assistant_history.json"
_MAX_HISTORY_ITEMS = 200
_history_lock = RLock()


def _history_path() -> Path:
    return settings.data_root / _HISTORY_FILENAME


def _read_history() -> list[dict[str, Any]]:
    path = _history_path()
    if not path.is_file():
        return []
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, list):
        raise ValueError("assistant history must be a JSON array")
    return [item for item in payload if isinstance(item, dict)]


def _write_history(items: list[dict[str, Any]]) -> None:
    path = _history_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid4().hex}.tmp")
    try:
        with temporary.open("w", encoding="utf-8") as handle:
            json.dump(items, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def _title(question: str, limit: int = 28) -> str:
    normalized = " ".join(question.split())
    return normalized if len(normalized) <= limit else f"{normalized[:limit]}…"


def save_assistant_history(
    question: str,
    response: dict[str, Any],
    context: dict[str, str] | None = None,
) -> dict[str, Any]:
    record = {
        "id": f"chat-{uuid4().hex}",
        "title": _title(question),
        "question": question.strip(),
        "answer": str(response.get("answer", "")),
        "steps": response.get("steps", []) if isinstance(response.get("steps", []), list) else [],
        "evidence": response.get("evidence", []) if isinstance(response.get("evidence", []), list) else [],
        "provider": str(response.get("provider", "unknown")),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "context": context or {},
    }
    with _history_lock:
        items = _read_history()
        items.insert(0, record)
        _write_history(items[:_MAX_HISTORY_ITEMS])
    return record


def list_assistant_history(query: str = "", limit: int = 50) -> list[dict[str, Any]]:
    with _history_lock:
        items = _read_history()
    items.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    needle = query.strip().casefold()
    if needle:
        items = [item for item in items if needle in json.dumps(item, ensure_ascii=False).casefold()]
    return items[:limit]

