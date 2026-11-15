"""Canonicalize site references used for climate observations."""

from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any

from pipeline_errors import DataValidationError


def normalize_site(site: Mapping[str, Any]) -> dict[str, Any]:
    """Validate and normalize one configured point from ``config/sites.json``."""
    errors: list[str] = []
    site_id = site.get("id")
    municipality = site.get("municipality")
    state = site.get("state")
    zone_id = site.get("zone_id")
    mvp_reference = site.get("mvp_reference")

    for value, label in (
        (site_id, "id"),
        (municipality, "municipality"),
        (state, "state"),
        (zone_id, "zone_id"),
    ):
        if not isinstance(value, str) or not value.strip():
            errors.append(f"El sitio requiere {label} como texto no vacío.")

    try:
        latitude = float(site.get("latitude"))
        longitude = float(site.get("longitude"))
    except (TypeError, ValueError):
        latitude, longitude = math.nan, math.nan
        errors.append("El sitio requiere latitud y longitud numéricas.")

    if not math.isfinite(latitude) or not -90 <= latitude <= 90:
        errors.append("La latitud debe ser finita y estar entre -90 y 90.")
    if not math.isfinite(longitude) or not -180 <= longitude <= 180:
        errors.append("La longitud debe ser finita y estar entre -180 y 180.")
    if not isinstance(mvp_reference, bool):
        errors.append("mvp_reference debe ser booleano.")
    if errors:
        raise DataValidationError(errors)

    return {
        "id": site_id.strip(),
        "municipality": municipality.strip(),
        "state": state.strip(),
        "zone_id": zone_id.strip(),
        "latitude": latitude,
        "longitude": longitude,
        "mvp_reference": mvp_reference,
    }
