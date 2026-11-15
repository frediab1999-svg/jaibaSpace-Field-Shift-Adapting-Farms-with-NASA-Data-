"""JSON helpers with atomic writes for raw, staging, and export artifacts."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from pipeline_errors import PublicationError, SourceError


def read_json(path: str | Path) -> Any:
    file_path = Path(path)
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SourceError(f"No se pudo leer JSON desde {file_path}: {exc}") from exc


def write_json_atomic(path: str | Path, payload: Any) -> Path:
    """Write JSON to a temporary sibling and replace the destination on success."""
    destination = Path(path)
    temporary_path: Path | None = None
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        serialized = json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            dir=destination.parent,
            prefix=f".{destination.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary.write(serialized)
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_path = Path(temporary.name)
        os.replace(temporary_path, destination)
        return destination
    except (OSError, TypeError, ValueError) as exc:
        if temporary_path is not None:
            try:
                temporary_path.unlink(missing_ok=True)
            except OSError:
                pass
        raise PublicationError(f"No se pudo escribir el artefacto {destination}: {exc}") from exc
