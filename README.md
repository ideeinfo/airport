# 呼和浩特机场 AI 运维平台 Demo

实现已确认的 MagicPath 五屏设计，并将 IFC、图纸、设备台账、BA/BMS Demo 点表、服务区域关系和运维资料接入真实后端。

## 目录

- `frontend/`：React + Vite 前端。
- `backend/`：FastAPI API，同源托管构建后的前端。
- `scripts/build_demo_data.py`：从 IFC、图纸目录和 PDF 资料生成 Demo 数据。
- `scripts/import_neo4j.py`：以租户标签增量写入现有 Neo4j，不删除其他数据。
- `scripts/import_open_webui.py`：幂等创建 Open WebUI 知识库并导入资料，默认跳过超过 100MB 的单文件。
- `deploy/`：systemd、Nginx 和 Cloudflare Tunnel 配置模板。

## 本地构建

```bash
cd frontend
npm install
npm run build
```

服务器数据生成：

```bash
python scripts/build_demo_data.py \
  --ifc data/source/model.ifc \
  --drawings data/source/drawings \
  --documents data/source/documents \
  --output backend/data
```

运行 API：

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

所有真实系统凭据只通过环境变量注入，不写入仓库。

## 服务器部署

- 应用运行于 `127.0.0.1:8010`，由 `airport-ai-ops.service` 守护。
- 内网 Nginx 提供 HTTP 反向代理；公网 HTTPS 由现有 Cloudflare Tunnel 提供。
- Open WebUI 知识库名称为“呼和浩特机场机电运维首期资料库”；406MB 消防 PDF 排除，仅导入其可检索图纸目录摘要。
- Neo4j 图数据使用 `hohhot-airport-demo` 租户标识，导入脚本只做增量 `MERGE`。
