"""Normalize, validate, and export a local public catalog snapshot."""

from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

from normalize.catalogs import normalize_catalog
from pipeline_config import PipelineSettings, load_settings
from pipeline_errors import DataValidationError
from pipeline_version import content_version
from publishers.json_export import export_versioned_dataset
from sources.local_catalogs import load_catalog_file
from validate.catalogs import validate_catalog


def run_catalog_import(
    catalog_name: str,
    input_file: str | Path,
    source: str,
    source_updated_at: str,
    settings: PipelineSettings | None = None,
) -> Path:
    """Import a source-mapped CSV/JSON file and export an immutable version."""
    settings = settings or load_settings()
    if not source.strip() or not source_updated_at.strip():
        raise DataValidationError(["La fuente y su fecha de actualización son obligatorias."])

    file_path = Path(input_file).resolve()
    raw_items = load_catalog_file(file_path)
    items = normalize_catalog(catalog_name, raw_items, source, source_updated_at)
    validate_catalog(catalog_name, items)

    source_hash = hashlib.sha256(file_path.read_bytes()).hexdigest()
    raw_copy = settings.raw_dir / "catalogs" / catalog_name / f"{source_hash}{file_path.suffix.lower()}"
    raw_copy.parent.mkdir(parents=True, exist_ok=True)
    if file_path != raw_copy.resolve():
        shutil.copy2(file_path, raw_copy)

    transformation = {
        "catalog_name": catalog_name,
        "source": source,
        "source_updated_at": source_updated_at,
        "source_file_sha256": source_hash,
        "items": items,
    }
    version = content_version(items, transformation)
    dataset = {
        "schema_version": "1.0.0",
        "manifest": {
            "dataset_id": f"catalog-{catalog_name}",
            "kind": "catalog",
            "catalog": catalog_name,
            "source": source,
            "source_updated_at": source_updated_at,
            "source_file_sha256": source_hash,
            "record_count": len(items),
            "version": version,
            "updated_at": source_updated_at,
        },
        "items": items,
    }
    return export_versioned_dataset(dataset, settings.exports_dir)
