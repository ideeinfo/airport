#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
from collections import defaultdict
from pathlib import Path

import httpx


def commit(client: httpx.Client, database: str, statements: list[dict]) -> None:
    response = client.post(f"/db/{database}/tx/commit", json={"statements": statements})
    response.raise_for_status()
    errors = response.json().get("errors", [])
    if errors:
        raise RuntimeError(json.dumps(errors, ensure_ascii=False))


def batches(items: list[dict], size: int = 500) -> list[list[dict]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def main() -> None:
    parser = argparse.ArgumentParser(description="Upsert airport IFC knowledge graph into Neo4j")
    parser.add_argument("--graph", required=True, type=Path)
    parser.add_argument("--url", default=os.getenv("NEO4J_HTTP_URL", "http://127.0.0.1:17474"))
    parser.add_argument("--database", default=os.getenv("NEO4J_DATABASE", "neo4j"))
    parser.add_argument("--tenant", default="hohhot-airport-demo")
    args = parser.parse_args()
    username = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "")
    if not password:
        raise SystemExit("NEO4J_PASSWORD is required")
    graph = json.loads(args.graph.read_text(encoding="utf-8"))

    with httpx.Client(base_url=args.url.rstrip("/"), auth=(username, password), timeout=120) as client:
        commit(
            client,
            args.database,
            [
                {
                    "statement": "CREATE CONSTRAINT airport_entity_unique IF NOT EXISTS FOR (n:AirportEntity) REQUIRE (n.tenant, n.entity_id) IS UNIQUE"
                }
            ],
        )
        rows = [
            {
                "id": node["id"],
                "props": {
                    "label": node.get("label", node["id"]),
                    "kind": node.get("kind", "实体"),
                    "ifc_class": node.get("ifc_class", ""),
                    "payload": json.dumps(node.get("properties", {}), ensure_ascii=False),
                },
            }
            for node in graph.get("nodes", [])
        ]
        for batch in batches(rows):
            commit(
                client,
                args.database,
                [
                    {
                        "statement": "UNWIND $rows AS row MERGE (n:AirportEntity {tenant:$tenant, entity_id:row.id}) SET n += row.props, n.updated_at=datetime()",
                        "parameters": {"tenant": args.tenant, "rows": batch},
                    }
                ],
            )

        grouped: dict[str, list[dict]] = defaultdict(list)
        for edge in graph.get("edges", []):
            edge_type = str(edge.get("type", "RELATED_TO")).upper()
            if not re.fullmatch(r"[A-Z][A-Z0-9_]*", edge_type):
                raise ValueError(f"unsafe relationship type: {edge_type}")
            grouped[edge_type].append(edge)
        for edge_type, edges in grouped.items():
            for batch in batches(edges):
                commit(
                    client,
                    args.database,
                    [
                        {
                            "statement": f"UNWIND $rows AS row MATCH (a:AirportEntity {{tenant:$tenant, entity_id:row.source}}), (b:AirportEntity {{tenant:$tenant, entity_id:row.target}}) MERGE (a)-[r:{edge_type} {{tenant:$tenant}}]->(b) SET r.source_kind=coalesce(row.source_kind, 'ifc'), r.updated_at=datetime()",
                            "parameters": {"tenant": args.tenant, "rows": batch},
                        }
                    ],
                )
    print(json.dumps({"tenant": args.tenant, "nodes": len(rows), "edges": len(graph.get("edges", []))}, ensure_ascii=False))


if __name__ == "__main__":
    main()
