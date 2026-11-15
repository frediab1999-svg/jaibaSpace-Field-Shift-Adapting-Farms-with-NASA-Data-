"""Quality checks for normalized historical daily climate datasets."""

from __future__ import annotations

import math
from collections.abc import Mapping
from datetime import date
from typing import Any

from pipeline_errors import DataValidationError
from validate.metadata import validate_manifest


def validate_climate_dataset(dataset: Mapping[str, Any]) -> None:
    errors: list[str] = []
    if dataset.get("schema_version") != "2.0.0":
        errors.append("schema_version debe ser '2.0.0'.")

    manifest = dataset.get("manifest")
    if not isinstance(manifest, Mapping):
        raise DataValidationError(errors + ["El conjunto requiere un objeto manifest."])
    try:
        validate_manifest(dict(manifest))
    except DataValidationError as exc:
        errors.extend(exc.errors)

    site = dataset.get("site")
    if not isinstance(site, Mapping):
        errors.append("El conjunto requiere un objeto site.")
    else:
        if site.get("id") != manifest.get("site_id"):
            errors.append("site.id debe coincidir con manifest.site_id.")
        if site.get("zone_id") != manifest.get("zone_id"):
            errors.append("site.zone_id debe coincidir con manifest.zone_id.")
    location = dataset.get("location")
    if not isinstance(location, Mapping):
        errors.append("El conjunto requiere un objeto location.")
    else:
        latitude, longitude = location.get("latitude"), location.get("longitude")
        if (
            not isinstance(latitude, (int, float))
            or isinstance(latitude, bool)
            or not math.isfinite(latitude)
            or not -90 <= latitude <= 90
        ):
            errors.append("location.latitude debe ser una coordenada válida.")
        if (
            not isinstance(longitude, (int, float))
            or isinstance(longitude, bool)
            or not math.isfinite(longitude)
            or not -180 <= longitude <= 180
        ):
            errors.append("location.longitude debe ser una coordenada válida.")
        for field, minimum, maximum in (
            ("requested_latitude", -90, 90),
            ("requested_longitude", -180, 180),
        ):
            value = location.get(field)
            if (
                not isinstance(value, (int, float))
                or isinstance(value, bool)
                or not math.isfinite(value)
                or not minimum <= value <= maximum
            ):
                errors.append(f"location.{field} debe ser una coordenada válida.")

    period = dataset.get("period")
    if not isinstance(period, Mapping):
        errors.append("El conjunto requiere un objeto period.")
        start = end = None
    else:
        try:
            start = date.fromisoformat(str(period.get("start", "")))
            end = date.fromisoformat(str(period.get("end", "")))
            if start > end:
                errors.append("period.start no puede ser posterior a period.end.")
            if isinstance(manifest.get("period_start"), int) and start.year != manifest["period_start"]:
                errors.append("period.start no coincide con manifest.period_start.")
            if isinstance(manifest.get("period_end"), int) and end.year != manifest["period_end"]:
                errors.append("period.end no coincide con manifest.period_end.")
        except ValueError:
            errors.append("period.start y period.end deben ser fechas ISO 8601.")
            start = end = None

    parameters = dataset.get("parameters")
    if not isinstance(parameters, Mapping) or not parameters:
        errors.append("El conjunto requiere al menos un parámetro climático.")
        parameters = {}
    else:
        required_parameters = {
            "precipitation",
            "maximum_temperature",
            "minimum_temperature",
        }
        missing_parameters = required_parameters - set(parameters)
        if missing_parameters:
            errors.append(
                "Faltan parámetros requeridos: " + ", ".join(sorted(missing_parameters)) + "."
            )

    for parameter_name, parameter in parameters.items():
        prefix = f"parameters.{parameter_name}"
        if not isinstance(parameter, Mapping):
            errors.append(f"{prefix} debe ser un objeto.")
            continue
        for field in ("code", "unit", "resolution_approx"):
            if not isinstance(parameter.get(field), str) or not parameter[field].strip():
                errors.append(f"{prefix}.{field} debe ser texto no vacío.")
        observations = parameter.get("observations")
        if not isinstance(observations, list):
            errors.append(f"{prefix}.observations debe ser una lista.")
            continue

        coverage = parameter.get("coverage")
        if not isinstance(coverage, Mapping):
            errors.append(f"{prefix}.coverage debe identificar datos válidos y esperados.")

        previous_day: date | None = None
        valid_dates: list[str] = []
        for index, observation in enumerate(observations):
            item_prefix = f"{prefix}.observations[{index}]"
            if not isinstance(observation, Mapping):
                errors.append(f"{item_prefix} debe ser un objeto.")
                continue
            try:
                current_day = date.fromisoformat(str(observation.get("date", "")))
            except ValueError:
                errors.append(f"{item_prefix}.date no es una fecha ISO 8601.")
                continue
            if previous_day is not None and current_day <= previous_day:
                errors.append(f"{prefix}.observations no está ordenado o repite fechas.")
            if (start is not None and current_day < start) or (end is not None and current_day > end):
                errors.append(f"{item_prefix}.date está fuera del período declarado.")
            previous_day = current_day

            value = observation.get("value")
            if value is None:
                continue
            valid_dates.append(current_day.isoformat())
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                errors.append(f"{item_prefix}.value debe ser numérico o null.")
            elif not math.isfinite(value) or value == -999:
                errors.append(f"{item_prefix}.value contiene un valor no válido o sentinel -999.")
            elif parameter.get("code") == "IMERG_PRECTOT" and value < 0:
                errors.append(f"{item_prefix}.value contiene lluvia negativa.")

        if start is not None and end is not None:
            expected_days = (end - start).days + 1
            if len(observations) != expected_days:
                errors.append(
                    f"{prefix}.observations debe incluir {expected_days} fechas (faltantes como null)."
                )
            if isinstance(coverage, Mapping):
                if coverage.get("expected_days") != expected_days:
                    errors.append(f"{prefix}.coverage.expected_days no coincide con el período.")
                if coverage.get("valid_days") != len(valid_dates):
                    errors.append(f"{prefix}.coverage.valid_days no coincide con las observaciones.")
                if coverage.get("first_valid_date") != (valid_dates[0] if valid_dates else None):
                    errors.append(f"{prefix}.coverage.first_valid_date no coincide con las observaciones.")
                if coverage.get("last_valid_date") != (valid_dates[-1] if valid_dates else None):
                    errors.append(f"{prefix}.coverage.last_valid_date no coincide con las observaciones.")

    if errors:
        raise DataValidationError(errors)
