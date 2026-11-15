"""Normalize local catalog records while retaining unknown source attributes."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from pipeline_errors import DataValidationError


SUPPORTED_CATALOGS = {"crops", "varieties", "stages", "seeds"}
_STANDARD_FIELDS = {"id", "name", "source", "updated_at", "attributes"}


def normalize_catalog_item(
    catalog_name: str,
    item: Mapping[str, Any],
    source: str,
    updated_at: str,
) -> dict[str, Any]:
    """Map one source row to the common catalog envelope.

    Provider-specific field names are intentionally not guessed. A source
    adapter must map them to ``id`` and ``name`` before this function runs.
    """
    if catalog_name not in SUPPORTED_CATALOGS:
        raise DataValidationError([f"Catálogo no soportado: {catalog_name}."])

    item_id = item.get("id")
    name = item.get("name")
    if not isinstance(item_id, (str, int)) or not str(item_id).strip():
        raise DataValidationError(["Cada registro de catálogo requiere un id no vacío."])
    if not isinstance(name, str) or not name.strip():
        raise DataValidationError([f"El elemento {item_id!r} requiere un nombre no vacío."])
    if not source.strip():
        raise DataValidationError(["El catálogo requiere identificar la fuente de sus datos."])
    if not updated_at.strip():
        raise DataValidationError(["El catálogo requiere la fecha de corte o actualización de la fuente."])

    attributes = item.get("attributes", {})
    if attributes is None:
        attributes = {}
    if not isinstance(attributes, Mapping):
        raise DataValidationError([f"Los atributos de {item_id!r} deben ser un objeto."])

    extra_attributes = {key: value for key, value in item.items() if key not in _STANDARD_FIELDS}
    merged_attributes = {**attributes, **extra_attributes}

    return {
        "id": str(item_id).strip(),
        "name": name.strip(),
        "source": str(item.get("source") or source).strip(),
        "updated_at": str(item.get("updated_at") or updated_at).strip(),
        "attributes": merged_attributes,
    }


def normalize_catalog(
    catalog_name: str,
    items: list[Mapping[str, Any]],
    source: str,
    updated_at: str,
) -> list[dict[str, Any]]:
    """Normalize catalog rows and report all invalid rows in one error."""
    normalized: list[dict[str, Any]] = []
    errors: list[str] = []
    for index, item in enumerate(items):
        try:
            normalized.append(normalize_catalog_item(catalog_name, item, source, updated_at))
        except DataValidationError as exc:
            errors.extend(f"registro {index + 1}: {message}" for message in exc.errors)
    if errors:
        raise DataValidationError(errors)
    return normalized
