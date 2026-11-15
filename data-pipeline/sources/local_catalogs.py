"""Load administrator-provided CSV or JSON catalog snapshots."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from pipeline_errors import SourceError


def load_catalog_file(path: str | Path) -> list[dict[str, Any]]:
    """Read records without applying provider-specific transformations.

    JSON accepts either a top-level list or an object with an ``items`` list.
    CSV is read as UTF-8 with an optional byte-order mark. Provider-specific
    field mapping belongs in a source adapter after a source is selected.
    """
    file_path = Path(path)
    if not file_path.is_file():
        raise SourceError(f"No existe el archivo de catálogo: {file_path}")

    suffix = file_path.suffix.lower()
    try:
        if suffix == ".json":
            payload = json.loads(file_path.read_text(encoding="utf-8"))
            records = payload.get("items") if isinstance(payload, dict) else payload
        elif suffix == ".csv":
            with file_path.open("r", encoding="utf-8-sig", newline="") as stream:
                records = list(csv.DictReader(stream))
        else:
            raise SourceError("El catálogo local debe ser un archivo .json o .csv.")
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, csv.Error) as exc:
        raise SourceError(f"No se pudo leer el catálogo {file_path}: {exc}") from exc

    if not isinstance(records, list) or any(not isinstance(item, dict) for item in records):
        raise SourceError("El catálogo debe contener una lista de objetos.")
    return records
