from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    project_root: Path
    data_root: Path
    drawings_root: Path
    documents_root: Path
    ifc_path: Path
    frontend_dist: Path
    open_webui_url: str
    open_webui_api_key: str
    open_webui_model: str
    open_webui_knowledge_id: str
    demo_user: str
    demo_password: str


def load_settings() -> Settings:
    project_root = Path(os.getenv("AIRPORT_PROJECT_ROOT", Path(__file__).resolve().parents[2])).resolve()
    source_root = Path(os.getenv("AIRPORT_SOURCE_ROOT", project_root.parent)).resolve()
    return Settings(
        project_root=project_root,
        data_root=Path(os.getenv("AIRPORT_DATA_ROOT", project_root / "backend" / "data")).resolve(),
        drawings_root=Path(os.getenv("AIRPORT_DRAWINGS_ROOT", source_root / "部分机房图纸")).resolve(),
        documents_root=Path(os.getenv("AIRPORT_DOCUMENTS_ROOT", source_root / "文档资料")).resolve(),
        ifc_path=Path(
            os.getenv(
                "AIRPORT_IFC_PATH",
                source_root / "合并版Demo_施工单位机房整合-HJ-CD-TA0101-MEP-B1_航站楼地下一层空调机房模型_V1.ifc",
            )
        ).resolve(),
        frontend_dist=Path(os.getenv("AIRPORT_FRONTEND_DIST", project_root / "frontend" / "dist")).resolve(),
        open_webui_url=os.getenv("OPEN_WEBUI_URL", "http://127.0.0.1:3080").rstrip("/"),
        open_webui_api_key=os.getenv("OPEN_WEBUI_API_KEY", ""),
        open_webui_model=os.getenv("OPEN_WEBUI_MODEL", ""),
        open_webui_knowledge_id=os.getenv("OPEN_WEBUI_KNOWLEDGE_ID", ""),
        demo_user=os.getenv("AIRPORT_DEMO_USER", "demo.operator"),
        demo_password=os.getenv("AIRPORT_DEMO_PASSWORD", "12345678"),
    )


settings = load_settings()
