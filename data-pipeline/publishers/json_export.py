"""Publish validated datasets as atomic, versioned JSON artifacts."""

from __future__ import annotations

import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from pipeline_errors import PublicationError
from pipeline_io import read_json, write_json_atomic


_SAFE_COMPONENT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def _safe_component(value: Any, field: str) -> str:
    if not isinstance(value, str) or not _SAFE_COMPONENT.fullmatch(value):
        raise PublicationError(f"{field} contiene caracteres no permitidos: {value!r}")
    return value


def _stable_manifest(manifest: Mapping[str, Any]) -> dict[str, Any]:
    stable = dict(manifest)
    stable.pop("updated_at", None)
    return stable


def _stable_dataset(dataset: Mapping[str, Any]) -> dict[str, Any]:
    stable = dict(dataset)
    manifest = stable.get("manifest")
    if isinstance(manifest, Mapping):
        stable["manifest"] = _stable_manifest(manifest)
    provenance = stable.get("provenance")
    if isinstance(provenance, Mapping):
        stable_provenance = dict(provenance)
        stable_provenance.pop("retrieved_at", None)
        stable["provenance"] = stable_provenance
    return stable


def export_versioned_dataset(dataset: Mapping[str, Any], exports_dir: str | Path) -> Path:
    """Write dataset, manifest, and latest pointer without exposing partial files."""
    manifest = dataset.get("manifest")
    if not isinstance(manifest, Mapping):
        raise PublicationError("No se puede exportar un conjunto sin manifest.")

    dataset_id = _safe_component(manifest.get("dataset_id"), "manifest.dataset_id")
    version = _safe_component(manifest.get("version"), "manifest.version")
    kind = manifest.get("kind")
    folder = "catalogs" if kind == "catalog" else "climate"
    root = Path(exports_dir).resolve()
    dataset_root = root / folder / dataset_id
    version_dir = dataset_root / version
    dataset_path = version_dir / "dataset.json"
    manifest_path = version_dir / "manifest.json"

    # Refuse paths whose resolved parent escapes the configured export root.
    if root not in dataset_path.resolve().parents:
        raise PublicationError("La ruta de exportación escapa del directorio configurado.")

    if dataset_path.is_file():
        existing_dataset = read_json(dataset_path)
        if not isinstance(existing_dataset, Mapping) or _stable_dataset(existing_dataset) != _stable_dataset(dataset):
            raise PublicationError(
                f"La versión {version} ya existe con contenido distinto; no se sobrescribió."
            )
        published_manifest = existing_dataset.get("manifest", manifest)
    else:
        write_json_atomic(dataset_path, dict(dataset))
        published_manifest = manifest

    if manifest_path.is_file():
        existing_manifest = read_json(manifest_path)
        if (
            not isinstance(existing_manifest, Mapping)
            or _stable_manifest(existing_manifest) != _stable_manifest(published_manifest)
        ):
            raise PublicationError(
                f"El manifiesto de la versión {version} ya existe con contenido distinto."
            )
        published_manifest = existing_manifest
    else:
        write_json_atomic(manifest_path, dict(published_manifest))

    write_json_atomic(
        dataset_root / "latest.json",
        {
            "dataset_id": dataset_id,
            "version": version,
            "kind": kind,
            "updated_at": published_manifest.get("updated_at"),
            "dataset_file": f"{version}/{dataset_path.name}",
        },
    )
    return dataset_path
