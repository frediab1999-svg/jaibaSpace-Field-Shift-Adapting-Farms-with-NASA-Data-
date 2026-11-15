"""Normalize NASA POWER daily responses to a versioned climate dataset."""

from __future__ import annotations

import math
from collections.abc import Mapping
from datetime import date, timedelta
from typing import Any

from normalize.geography import normalize_site
from pipeline_config import PipelineSettings
from pipeline_errors import DataValidationError


def _days_between(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def _numeric_value(value: Any, fill_value: Any) -> float | None:
    if value is None:
        return None
    try:
        numeric = float(value)
        fill = float(fill_value) if fill_value is not None else None
    except (TypeError, ValueError):
        raise ValueError(f"Valor climático no numérico: {value!r}") from None
    if not math.isfinite(numeric) or (fill is not None and numeric == fill):
        return None
    return round(numeric, 2)


def normalize_historical_response(
    site_input: Mapping[str, Any],
    raw: Mapping[str, Any],
    settings: PipelineSettings,
    request_url: str,
    version: str,
    retrieved_at: str,
) -> dict[str, Any]:
    """Create the canonical daily dataset while preserving gaps as ``None``."""
    errors: list[str] = []
    try:
        site = normalize_site(site_input)
    except DataValidationError as exc:
        errors.extend(exc.errors)
        site = {}

    header = raw.get("header", {})
    if not isinstance(header, Mapping):
        errors.append("La respuesta NASA POWER no contiene un objeto header.")
        header = {}
    properties = raw.get("properties", {})
    parameter_data = properties.get("parameter", {}) if isinstance(properties, Mapping) else {}
    parameter_info = raw.get("parameters", {})
    if not isinstance(parameter_data, Mapping):
        errors.append("La respuesta NASA POWER no contiene properties.parameter.")
        parameter_data = {}
    if not isinstance(parameter_info, Mapping):
        errors.append("La respuesta NASA POWER no contiene metadatos de parameters.")
        parameter_info = {}

    definitions = settings.dataset_metadata.get("historical_climate", {}).get("parameters", {})
    known_codes = {
        definition.get("code")
        for definition in definitions.values()
        if isinstance(definition, Mapping)
    }
    for configured_code in settings.parameters:
        if configured_code not in known_codes:
            errors.append(f"No hay metadatos configurados para el parámetro {configured_code}.")
    fill_value = header.get("fill_value") if isinstance(header, Mapping) else None
    normalized_parameters: dict[str, dict[str, Any]] = {}

    for semantic_name, definition in definitions.items():
        code = definition.get("code")
        if code not in settings.parameters:
            continue
        source_values = parameter_data.get(code)
        if not isinstance(source_values, Mapping):
            errors.append(f"La respuesta no contiene la serie diaria del parámetro {code}.")
            continue

        source_metadata = parameter_info.get(code, {})
        unit = source_metadata.get("units") if isinstance(source_metadata, Mapping) else None
        if not unit:
            errors.append(f"La respuesta no informa las unidades del parámetro {code}.")
            continue

        observations: list[dict[str, Any]] = []
        for day in _days_between(settings.start_date, settings.end_date):
            raw_value = source_values.get(day.strftime("%Y%m%d"))
            try:
                value = _numeric_value(raw_value, fill_value)
            except ValueError as exc:
                errors.append(f"{code} {day.isoformat()}: {exc}")
                value = None
            observations.append({"date": day.isoformat(), "value": value})

        valid_dates = [item["date"] for item in observations if item["value"] is not None]

        normalized_parameters[semantic_name] = {
            "code": code,
            "product": definition.get("product"),
            "unit": unit,
            "resolution_approx": definition.get("resolution_approx"),
            "time_standard": settings.time_standard,
            "coverage": {
                "valid_days": len(valid_dates),
                "expected_days": len(observations),
                "first_valid_date": valid_dates[0] if valid_dates else None,
                "last_valid_date": valid_dates[-1] if valid_dates else None,
            },
            "observations": observations,
        }

    if errors:
        raise DataValidationError(errors)

    source_definition = settings.dataset_metadata["historical_climate"]
    geometry = raw.get("geometry", {})
    api_metadata = header.get("api", {})

    coordinates = geometry.get("coordinates", []) if isinstance(geometry, Mapping) else []
    source_longitude = site.get("longitude")
    source_latitude = site.get("latitude")
    elevation = None
    if isinstance(coordinates, list) and len(coordinates) >= 2:
        try:
            source_longitude = float(coordinates[0])
            source_latitude = float(coordinates[1])
            elevation = coordinates[2] if len(coordinates) > 2 else None
        except (TypeError, ValueError):
            errors.append("NASA POWER devolvió coordenadas no numéricas en geometry.coordinates.")
    if errors:
        raise DataValidationError(errors)

    return {
        "schema_version": "2.0.0",
        "manifest": {
            "dataset_id": f"climate-historical-{site['id']}",
            "site_id": site["id"],
            "zone_id": site["zone_id"],
            "kind": "historical",
            "source": source_definition["source"],
            "scenario": None,
            "period_start": settings.start_date.year,
            "period_end": settings.end_date.year,
            "resolution": "daily point; see per-parameter resolution",
            "version": version,
            "updated_at": retrieved_at,
        },
        "site": site,
        "location": {
            "latitude": source_latitude,
            "longitude": source_longitude,
            "elevation_m": elevation,
            "requested_latitude": site["latitude"],
            "requested_longitude": site["longitude"],
        },
        "provenance": {
            "source_url": request_url,
            "api_version": api_metadata.get("version") if isinstance(api_metadata, Mapping) else None,
            "retrieved_at": retrieved_at,
            "time_standard": settings.time_standard,
            "limitations": source_definition["limitations"],
        },
        "period": {
            "start": settings.start_date.isoformat(),
            "end": settings.end_date.isoformat(),
        },
        "parameters": normalized_parameters,
        "definitions": {
            "dry_day_threshold_mm": settings.dry_day_threshold_mm,
            "minimum_dry_streak_days": settings.minimum_dry_streak_days,
            "summary_window": {
                "start": settings.summary_window_start,
                "end": settings.summary_window_end,
            },
            "temperature_usage": settings.temperature_usage,
            "missing_values": "null; missing dates and NASA fill values are not zero",
        },
        "derived": {},
    }
