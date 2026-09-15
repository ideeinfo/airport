from __future__ import annotations

import unittest
from unittest.mock import patch

from backend.app.assistant import fallback_answer, retrieve


class AssistantTests(unittest.TestCase):
    def test_excluded_large_pdf_is_never_retrieved(self) -> None:
        corpus = [
            {"document": "消防（土建航站楼火自报243）.pdf", "page": 1, "content": "空调机组 风量 过滤器"},
            {"document": "设备手册.pdf", "page": 2, "content": "空调机组 风量 过滤器"},
        ]
        with patch("backend.app.assistant.read_json", return_value=corpus):
            evidence = retrieve("空调机组风量不足")
        self.assertEqual([item["document"] for item in evidence], ["设备手册.pdf"])

    def test_non_ahu_presets_have_asset_specific_fallback_answers(self) -> None:
        cases = {
            "送风口 5466537 风量不足如何复核？": ("5466537", "风量罩"),
            "风管 5466492 疑似漏风应检查什么？": ("5466492", "烟雾"),
            "阀门 5500084 卡滞如何排查？": ("5500084", "阀杆"),
            "波纹补偿器 5466510 巡检重点是什么？": ("5466510", "导向支架"),
        }
        for question, expected in cases.items():
            with self.subTest(question=question):
                result = fallback_answer(question, [])
                self.assertIn(expected[0], result["answer"])
                self.assertIn(expected[1], result["answer"])
                self.assertGreaterEqual(len(result["steps"]), 4)


if __name__ == "__main__":
    unittest.main()
