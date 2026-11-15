"""Validation for climate dataset manifests shared with the API concept."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pipeline_errors import DataValidationError


def validate_manifest(manifest: dict[str, Any]) -> None:
    """Require traceable metadata before a climate dataset can be exported."""
    errors: list[str] = []
    required_text = (
        "dataset_id",
        "site_id",
        "zone_id",
        "source",
        "resolution",
        "version",
        "updated_at",
    )
    for key in required_text:
        if not isinstance(manifest.get(key), str) or not manifest[key].strip():
            errors.append(f"El manifiesto requiere {key} como texto no vacío.")

    if manifest.get("kind") not in {"historical", "projection"}:
        errors.append("kind debe ser 'historical' o 'projection'.")
    if manifest.get("kind") == "projection" and not str(manifest.get("scenario", "")).strip():
        errors.append("Un conjunto de proyección requiere identificar el escenario.")

    for key in ("period_start", "period_end"):
        value = manifest.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or not 1800 <= value <= 2200:
            errors.append(f"{key} debe ser un año entero válido.")
    start, end = manifest.get("period_start"), manifest.get("period_end")
    if isinstance(start, int) and isinstance(end, int) and start > end:
        errors.append("period_start no puede ser posterior a period_end.")

    updated_at = manifest.get("updated_at")
    if isinstance(updated_at, str):
        try:
            timestamp = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            if timestamp.tzinfo is None:
                errors.append("updated_at debe incluir zona horaria.")
        except ValueError:
            errors.append("updated_at debe ser una fecha ISO 8601 válida.")

    if errors:
        raise DataValidationError(errors)
