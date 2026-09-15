"""Small, dependency-free helpers for browser GLB generation."""

from __future__ import annotations


UINT16_VERTEX_LIMIT = 65_536


def index_storage(vertex_count: int) -> tuple[str, int]:
    """Return NumPy dtype and glTF component type for a mesh index buffer."""
    if vertex_count < 0:
        raise ValueError("vertex_count must be non-negative")
    if vertex_count <= UINT16_VERTEX_LIMIT:
        return "<u2", 5123
    return "<u4", 5125
