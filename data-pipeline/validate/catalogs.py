"""Validate normalized catalog rows before export."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date, datetime
from typing import Any

from normalize.catalogs import SUPPORTED_CATALOGS
from pipeline_errors import DataValidationError


def validate_catalog(catalog_name: str, items: list[Mapping[str, Any]]) -> None:
    errors: list[str] = []
    if catalog_name not in SUPPORTED_CATALOGS:
        errors.append(f"Catálogo no soportado: {catalog_name}.")
    if not items:
        errors.append("El catálogo no puede publicarse vacío.")

    seen: set[str] = set()
    for index, item in enumerate(items):
        prefix = f"registro {index + 1}"
        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id.strip():
            errors.append(f"{prefix}: id vacío o inválido.")
        elif item_id.casefold() in seen:
            errors.append(f"{prefix}: id duplicado {item_id!r}.")
        else:
            seen.add(item_id.casefold())

        if not isinstance(item.get("name"), str) or not item["name"].strip():
            errors.append(f"{prefix}: name vacío o inválido.")
        for field in ("source", "updated_at"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                errors.append(f"{prefix}: falta metadato {field}.")
        updated_at = item.get("updated_at")
        if isinstance(updated_at, str) and updated_at.strip():
            try:
                date.fromisoformat(updated_at)
            except ValueError:
                try:
                    timestamp = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                    if timestamp.tzinfo is None:
                        errors.append(f"{prefix}: updated_at debe incluir zona horaria.")
                except ValueError:
                    errors.append(f"{prefix}: updated_at debe ser una fecha ISO 8601.")
        if not isinstance(item.get("attributes", {}), Mapping):
            errors.append(f"{prefix}: attributes debe ser un objeto.")

    if errors:
        raise DataValidationError(errors)
