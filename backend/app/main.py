from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .assistant import ask
from .assistant_history import list_assistant_history, save_assistant_history
from .config import settings
from .store import build_drawing_tree, read_json, safe_document_path, safe_drawing_path, scan_drawings, search_records


app = FastAPI(title="呼和浩特机场AI运维平台 API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5180", "http://localhost:5180"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=4000)
    context: dict[str, str] = Field(default_factory=dict)


@app.get("/api/health")
def health() -> dict[str, Any]:
    graph = read_json("graph.json", {"nodes": [], "edges": [], "meta": {}})
    return {
        "status": "ok",
        "ifc_ready": settings.ifc_path.is_file(),
        "drawing_count": len(scan_drawings()),
        "graph_nodes": len(graph.get("nodes", [])),
        "graph_edges": len(graph.get("edges", [])),
        "knowledge_mode": "open-webui"
        if settings.open_webui_api_key and settings.open_webui_model
        else "local-retrieval",
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict[str, str]:
    if payload.username != settings.demo_user or payload.password != settings.demo_password:
        raise HTTPException(status_code=401, detail="账号或密码不正确")
    return {"access_token": "airport-demo-session", "token_type": "bearer", "display_name": "运维管理员"}


@app.get("/api/dashboard")
def dashboard() -> dict[str, Any]:
    return read_json(
        "dashboard.json",
        {
            "equipment": {"total": 657, "running": 482, "fault": 15},
            "energy": {"today_mwh": 186.4, "hvac_mwh": 58.7, "yoy_percent": -6.2},
            "alarms": {"total": 15, "critical": 3, "general": 12},
            "work_orders": {"today": 72, "done": 46, "doing": 9, "todo": 17},
        },
    )


@app.get("/api/drawings")
def drawings(q: str = Query(default="", max_length=200), discipline: str = Query(default="")) -> dict[str, Any]:
    records = scan_drawings()
    if discipline:
        records = [record for record in records if record.get("discipline") == discipline]
    if q:
        records = search_records(records, q, ("title", "discipline", "relative_path", "id"))
    return {"total": len(records), "items": records, "tree": build_drawing_tree(scan_drawings())}


@app.get("/api/drawings/file/{relative_path:path}")
def drawing_file(relative_path: str) -> FileResponse:
    try:
        path = safe_drawing_path(relative_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="图纸不存在") from exc
    return FileResponse(path, media_type="application/pdf", filename=path.name, content_disposition_type="inline")


@app.get("/api/documents/file/{relative_path:path}")
def document_file(relative_path: str) -> FileResponse:
    try:
        path = safe_document_path(relative_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="资料文档不存在") from exc
    return FileResponse(path, media_type="application/pdf", filename=path.name, content_disposition_type="inline")


@app.get("/api/assets/login-background")
def login_background() -> FileResponse:
    path = settings.project_root / "frontend" / "public" / "login-bg-wireframe.png"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="背景图未部署")
    return FileResponse(path, media_type="image/png")


@app.get("/api/graph")
def graph(
    focus: str = Query(default="AHU-0B2-04", max_length=160),
    hops: int = Query(default=1, ge=1, le=3),
) -> dict[str, Any]:
    payload = read_json("graph.json", {"nodes": [], "edges": [], "meta": {}})
    if not focus:
        return payload
    matching_ids = {
        node["id"]
        for node in payload.get("nodes", [])
        if focus.casefold() in f"{node.get('id', '')} {node.get('label', '')}".casefold()
    }
    if not matching_ids:
        return payload
    neighbor_ids = set(matching_ids)
    frontier = set(matching_ids)
    for _ in range(hops):
        discovered: set[str] = set()
        for edge in payload.get("edges", []):
            if edge.get("source") in frontier or edge.get("target") in frontier:
                discovered.update((edge.get("source"), edge.get("target")))
        frontier = discovered - neighbor_ids
        neighbor_ids.update(discovered)
        if not frontier:
            break
    return {
        "meta": payload.get("meta", {}),
        "nodes": [node for node in payload.get("nodes", []) if node.get("id") in neighbor_ids],
        "edges": [
            edge
            for edge in payload.get("edges", [])
            if edge.get("source") in neighbor_ids and edge.get("target") in neighbor_ids
        ],
    }


@app.get("/api/rooms")
def rooms() -> list[dict[str, Any]]:
    return read_json("rooms.json", [])


@app.get("/api/assets")
def assets(q: str = Query(default="", max_length=200), limit: int = Query(default=100, ge=1, le=2000)) -> dict[str, Any]:
    records = read_json("assets.json", [])
    if q:
        records = search_records(records, q, ("asset_code", "name", "ifc_class", "system", "location"))
    return {"total": len(records), "items": records[:limit]}


@app.get("/api/points")
def points(asset_code: str = Query(default="")) -> list[dict[str, Any]]:
    records = read_json("points.json", [])
    if asset_code:
        records = [record for record in records if record.get("asset_code") == asset_code]
    return records


@app.get("/api/assistant/history")
def assistant_history(
    q: str = Query(default="", max_length=200),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    items = list_assistant_history(q, limit)
    return {"total": len(items), "items": items}


@app.post("/api/assistant/chat")
async def assistant_chat(payload: ChatRequest) -> dict[str, Any]:
    response = await ask(payload.question)
    return save_assistant_history(payload.question, response, payload.context)


@app.get("/model/airport-mep-v2.glb")
def ifc_preview_model(request: Request) -> FileResponse:
    model_path = settings.frontend_dist / "model" / "airport-mep-v2.glb"
    gzip_path = model_path.with_suffix(".glb.gz")
    accepts_gzip = "gzip" in request.headers.get("accept-encoding", "").lower()
    response_path = gzip_path if accepts_gzip and gzip_path.is_file() else model_path
    if not response_path.is_file():
        raise HTTPException(status_code=404, detail="IFC预览模型尚未生成")
    headers = {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Vary": "Accept-Encoding",
    }
    if response_path == gzip_path:
        headers["Content-Encoding"] = "gzip"
    return FileResponse(response_path, media_type="model/gltf-binary", headers=headers)


if settings.frontend_dist.is_dir():
    assets_dir = settings.frontend_dist / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        candidate = (settings.frontend_dist / path).resolve()
        if candidate.is_file() and settings.frontend_dist in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(settings.frontend_dist / "index.html")
