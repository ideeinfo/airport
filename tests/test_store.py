from __future__ import annotations

import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from backend.app.config import settings
from backend.app.store import build_drawing_tree, safe_document_path, search_records


class StoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.records = [
            {
                "id": "DRW-1",
                "title": "T-BE-B1-M18空调机房风管平面1",
                "discipline": "暖通",
                "relative_path": "暖通/T-BE-B1-M18空调机房风管平面1.pdf",
                "ifc_room": True,
            },
            {
                "id": "DRW-2",
                "title": "建筑平面图",
                "discipline": "建筑",
                "relative_path": "建筑/建筑平面图.pdf",
                "ifc_room": False,
            },
        ]

    def test_ifc_room_search_is_prioritized(self) -> None:
        result = search_records(self.records, "M18 空调机房", ("title", "discipline", "relative_path"))
        self.assertEqual(result[0]["id"], "DRW-1")

    def test_tree_places_disciplines_below_ifc_room(self) -> None:
        tree = build_drawing_tree(self.records)
        room = next(item for item in tree if item["name"] == "T-BE-B1-M18空调机房")
        hvac = next(item for item in room["children"] if item["name"] == "暖通")
        self.assertEqual(room["node_type"], "space")
        self.assertTrue(room["highlight"])
        self.assertEqual(room["count"], 2)
        self.assertEqual([item["name"] for item in room["children"]], ["建筑", "暖通"])
        self.assertEqual(hvac["node_type"], "discipline")
        self.assertEqual(hvac["children"], [])
        self.assertNotIn("暖通通用图纸", [item["name"] for item in room["children"]])

    def test_document_preview_only_serves_pdf_inside_document_root(self) -> None:
        with TemporaryDirectory() as folder:
            root = Path(folder)
            pdf = root / "设备手册.pdf"
            pdf.write_bytes(b"%PDF-1.4")
            excluded = root / "消防（土建航站楼火自报243）.pdf"
            excluded.write_bytes(b"%PDF-1.4")
            with patch("backend.app.store.settings", replace(settings, documents_root=root)):
                self.assertEqual(safe_document_path(pdf.name), pdf.resolve())
                with self.assertRaises(FileNotFoundError):
                    safe_document_path("设备手册.docx")
                with self.assertRaises(FileNotFoundError):
                    safe_document_path(excluded.name)
                with self.assertRaises(ValueError):
                    safe_document_path("../越界.pdf")


if __name__ == "__main__":
    unittest.main()
