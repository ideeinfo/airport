#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import os
from pathlib import Path

import httpx


def main() -> None:
    parser = argparse.ArgumentParser(description="Create/update the airport knowledge base in Open WebUI")
    parser.add_argument("--documents", required=True, type=Path)
    parser.add_argument("--base-url", default=os.getenv("OPEN_WEBUI_URL", "http://127.0.0.1:3080"))
    parser.add_argument("--name", default="呼和浩特机场机电运维首期资料库")
    parser.add_argument("--description", default="呼和浩特机场智慧运维 Demo：设备手册、技术样本、培训卡及消防资料")
    parser.add_argument("--max-file-mb", type=float, default=100, help="Skip oversized source files")
    args = parser.parse_args()
    api_key = os.getenv("OPEN_WEBUI_API_KEY", "")
    if not api_key:
        raise SystemExit("OPEN_WEBUI_API_KEY is required")
    supported_suffixes = {".pdf", ".txt", ".md", ".docx"}
    candidates = [
        path for path in args.documents.iterdir() if path.is_file() and path.suffix.casefold() in supported_suffixes
    ]
    max_file_bytes = int(args.max_file_mb * 1024 * 1024)
    oversized = [path.name for path in candidates if path.stat().st_size > max_file_bytes]
    documents = sorted(
        (path for path in candidates if path.stat().st_size <= max_file_bytes),
        key=lambda path: (path.stat().st_size, path.name.casefold()),
    )
    if not documents:
        raise SystemExit(f"no supported documents found in {args.documents}")

    headers = {"Authorization": f"Bearer {api_key}"}
    with httpx.Client(base_url=args.base_url.rstrip("/"), headers=headers, timeout=900) as client:
        listing = client.get("/api/v1/knowledge/")
        listing.raise_for_status()
        existing = next((item for item in listing.json().get("items", []) if item.get("name") == args.name), None)
        if existing:
            knowledge_id = existing["id"]
        else:
            created = client.post(
                "/api/v1/knowledge/create",
                json={"name": args.name, "description": args.description, "access_control": None},
            )
            created.raise_for_status()
            knowledge_id = created.json()["id"]

        details = client.get(f"/api/v1/knowledge/{knowledge_id}")
        details.raise_for_status()
        known_names = {item.get("filename") or item.get("name") for item in (details.json().get("files") or [])}
        imported: list[str] = []
        skipped: list[str] = []
        for path in documents:
            if path.name in known_names:
                skipped.append(path.name)
                continue
            with path.open("rb") as handle:
                content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
                uploaded = client.post(
                    "/api/v1/files/?process=true&process_in_background=false",
                    files={"file": (path.name, handle, content_type)},
                    data={"metadata": json.dumps({"source": "呼和浩特机场/文档资料"}, ensure_ascii=False)},
                )
            uploaded.raise_for_status()
            file_id = uploaded.json()["id"]
            attached = client.post(f"/api/v1/knowledge/{knowledge_id}/file/add", json={"file_id": file_id})
            attached.raise_for_status()
            imported.append(path.name)
        print(
            json.dumps(
                {
                    "knowledge_id": knowledge_id,
                    "imported": imported,
                    "skipped": skipped,
                    "skipped_oversize": oversized,
                },
                ensure_ascii=False,
            )
        )


if __name__ == "__main__":
    main()
