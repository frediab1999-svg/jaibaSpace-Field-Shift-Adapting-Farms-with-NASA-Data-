"""Deterministic content versioning for reproducible pipeline artifacts."""

from __future__ import annotations

import hashlib
import json
from typing import Any


PIPELINE_VERSION = "0.1.0"


def content_version(source_payload: Any, transformation: dict[str, Any]) -> str:
    """Hash source content and transformation parameters, not download time."""
    fingerprint = {
        "pipeline_version": PIPELINE_VERSION,
        "source_payload": source_payload,
        "transformation": transformation,
    }
    canonical = json.dumps(
        fingerprint,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")
    return f"sha256-{hashlib.sha256(canonical).hexdigest()}"
