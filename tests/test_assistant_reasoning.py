from __future__ import annotations

import unittest

from backend.app.assistant import clean_model_answer


class AssistantReasoningTests(unittest.TestCase):
    def test_removes_complete_reasoning_block_and_keeps_final_answer(self) -> None:
        content = "<thought>内部检索与推理</thought>\n过滤器终阻力达到初阻力两倍以上时，应清洗或更换。"
        self.assertEqual(clean_model_answer(content), "过滤器终阻力达到初阻力两倍以上时，应清洗或更换。")

    def test_removes_common_reasoning_tags_case_insensitively(self) -> None:
        content = "<THINK>hidden</THINK><final>最终答复</final>"
        self.assertEqual(clean_model_answer(content), "最终答复")

    def test_never_exposes_unclosed_reasoning(self) -> None:
        self.assertEqual(clean_model_answer("<thought>未闭合的内部推理"), "模型未返回可展示的最终答案，请重新提问。")

    def test_preserves_normal_answer(self) -> None:
        answer = "请先核对设备编码，再检查过滤器压差。"
        self.assertEqual(clean_model_answer(answer), answer)


if __name__ == "__main__":
    unittest.main()
