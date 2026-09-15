from __future__ import annotations

import pytest
from starlette.requests import Request

from backend.app.main import ifc_preview_model
from scripts.model_optimization import index_storage


def test_small_ifc_meshes_use_16_bit_indices() -> None:
    assert index_storage(23_714) == ("<u2", 5123)
    assert index_storage(65_536) == ("<u2", 5123)


def test_large_meshes_keep_32_bit_indices() -> None:
    assert index_storage(65_537) == ("<u4", 5125)


def test_negative_vertex_count_is_rejected() -> None:
    with pytest.raises(ValueError):
        index_storage(-1)


def test_ifc_model_uses_precompressed_response_when_supported() -> None:
    request = Request({"type": "http", "method": "GET", "path": "/model/airport-mep-v2.glb", "headers": [(b"accept-encoding", b"gzip, br")]})
    response = ifc_preview_model(request)

    assert str(response.path).endswith("airport-mep-v2.glb.gz")
    assert response.headers["content-encoding"] == "gzip"
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"


def test_ifc_model_keeps_uncompressed_fallback() -> None:
    request = Request({"type": "http", "method": "GET", "path": "/model/airport-mep-v2.glb", "headers": [(b"accept-encoding", b"identity")]})
    response = ifc_preview_model(request)

    assert str(response.path).endswith("airport-mep-v2.glb")
    assert "content-encoding" not in response.headers
