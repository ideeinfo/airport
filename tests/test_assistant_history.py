from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.main import app


def test_chat_result_is_persisted_and_searchable() -> None:
    answer = {
        "answer": "先检查过滤器压差，再检查风阀开度。",
        "steps": ["检查过滤器压差", "检查风阀开度"],
        "evidence": [{"document": "空调机组设备手册.pdf", "page": 6, "content": "风量不足检查"}],
        "provider": "open-webui",
    }
    with TemporaryDirectory() as folder:
        history_settings = replace(settings, data_root=Path(folder))
        with patch("backend.app.assistant_history.settings", history_settings), patch(
            "backend.app.main.ask", AsyncMock(return_value=answer)
        ):
            client = TestClient(app)
            created = client.post(
                "/api/assistant/chat",
                json={"question": "AHU-0B2-04 风量不足怎么检查？", "context": {"asset_code": "AHU-0B2-04"}},
            )
            assert created.status_code == 200
            record = created.json()
            assert record["id"]
            assert record["question"] == "AHU-0B2-04 风量不足怎么检查？"
            assert record["answer"] == answer["answer"]
            assert record["evidence"] == answer["evidence"]
            assert record["context"] == {"asset_code": "AHU-0B2-04"}

            persisted = Path(folder, "assistant_history.json")
            assert persisted.is_file()

            history = client.get("/api/assistant/history", params={"q": "设备手册"})
            assert history.status_code == 200
            payload = history.json()
            assert payload["total"] == 1
            assert payload["items"][0]["id"] == record["id"]


def test_history_is_returned_newest_first() -> None:
    from backend.app.assistant_history import list_assistant_history, save_assistant_history

    with TemporaryDirectory() as folder:
        history_settings = replace(settings, data_root=Path(folder))
        with patch("backend.app.assistant_history.settings", history_settings):
            first = save_assistant_history("第一条问题", {"answer": "第一条回答", "steps": [], "evidence": [], "provider": "local"})
            second = save_assistant_history("第二条问题", {"answer": "第二条回答", "steps": [], "evidence": [], "provider": "local"})
            items = list_assistant_history()

    assert [item["id"] for item in items] == [second["id"], first["id"]]

