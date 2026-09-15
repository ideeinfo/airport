from __future__ import annotations

import unittest
from unittest.mock import patch

from backend.app.assistant import retrieve


class AssistantTests(unittest.TestCase):
    def test_excluded_large_pdf_is_never_retrieved(self) -> None:
        corpus = [
            {"document": "消防（土建航站楼火自报243）.pdf", "page": 1, "content": "空调机组 风量 过滤器"},
            {"document": "设备手册.pdf", "page": 2, "content": "空调机组 风量 过滤器"},
        ]
        with patch("backend.app.assistant.read_json", return_value=corpus):
            evidence = retrieve("空调机组风量不足")
        self.assertEqual([item["document"] for item in evidence], ["设备手册.pdf"])


if __name__ == "__main__":
    unittest.main()
