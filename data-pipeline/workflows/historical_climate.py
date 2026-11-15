"""Acquire and publish historical climate datasets for configured sites."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import Any

from aggregate.climate import aggregate_historical_climate
from normalize.climate import normalize_historical_response
from normalize.geography import normalize_site
from pipeline_config import PipelineSettings, load_settings
from pipeline_errors import DataValidationError, SourceError
from pipeline_io import read_json, write_json_atomic
from pipeline_metadata import utc_timestamp
from pipeline_version import content_version
from publishers.json_export import export_versioned_dataset
from sources.nasa.power import build_daily_point_url, fetch_daily_point
from validate.climate import validate_climate_dataset


def run_historical_climate(
    sites_file: str | Path | None = None,
    exports_dir: str | Path | None = None,
    site_ids: set[str] | None = None,
    zone_ids: set[str] | None = None,
    settings: PipelineSettings | None = None,
) -> list[Path]:
    """Fetch all configured NASA POWER parameters for selected sites.

    Raw responses are retained, intermediate datasets stay in ``staging/``,
    and only validated, versioned JSON datasets are published.
    """
    settings = settings or load_settings()
    if sites_file is not None:
        settings = replace(settings, sites_file=Path(sites_file).resolve())
    if exports_dir is not None:
        settings = replace(settings, exports_dir=Path(exports_dir).resolve())

    catalog = read_json(settings.sites_file)
    source_sites = catalog.get("sites") if isinstance(catalog, dict) else None
    if not isinstance(source_sites, list) or not source_sites:
        raise SourceError("El catálogo debe contener una lista no vacía en 'sites'.")

    normalized_sites: list[tuple[dict[str, Any], dict[str, Any]]] = []
    seen_ids: set[str] = set()
    for source_site in source_sites:
        if not isinstance(source_site, dict):
            raise DataValidationError(["Cada elemento de 'sites' debe ser un objeto."])
        site = normalize_site(source_site)
        if site["id"] in seen_ids:
            raise DataValidationError([f"El id de sitio {site['id']!r} está duplicado."])
        seen_ids.add(site["id"])
        normalized_sites.append((source_site, site))

    available_zones = {site["zone_id"] for _, site in normalized_sites}
    if site_ids:
        missing_ids = site_ids - seen_ids
        if missing_ids:
            raise DataValidationError(
                [f"No existen los sitios solicitados: {', '.join(sorted(missing_ids))}."]
            )
    if zone_ids:
        missing_zones = zone_ids - available_zones
        if missing_zones:
            raise DataValidationError(
                [f"No existen las zonas solicitadas: {', '.join(sorted(missing_zones))}."]
            )

    selected_sites = [
        pair
        for pair in normalized_sites
        if (not site_ids or pair[1]["id"] in site_ids)
        and (not zone_ids or pair[1]["zone_id"] in zone_ids)
    ]
    if not selected_sites:
        raise DataValidationError(["Los filtros no seleccionaron ningún sitio."])

    outputs: list[Path] = []
    for source_site, site in selected_sites:
        request_url = build_daily_point_url(
            base_url=settings.nasa_power_base_url,
            latitude=site["latitude"],
            longitude=site["longitude"],
            start_date=settings.start_date,
            end_date=settings.end_date,
            parameters=settings.parameters,
            community=settings.nasa_power_community,
            time_standard=settings.time_standard,
        )
        transformation = {
            "site_id": site["id"],
            "zone_id": site["zone_id"],
            "latitude": site["latitude"],
            "longitude": site["longitude"],
            "start_date": settings.start_date.isoformat(),
            "end_date": settings.end_date.isoformat(),
            "parameters": list(settings.parameters),
            "dry_day_threshold_mm": settings.dry_day_threshold_mm,
            "minimum_dry_streak_days": settings.minimum_dry_streak_days,
            "summary_window_start": settings.summary_window_start,
            "summary_window_end": settings.summary_window_end,
            "temperature_usage": settings.temperature_usage,
        }
        raw = fetch_daily_point(
            request_url,
            timeout_seconds=settings.timeout_seconds,
            retries=settings.retries,
        )
        version = content_version(raw, transformation)
        retrieved_at = utc_timestamp()

        write_json_atomic(
            settings.raw_dir / "nasa_power" / site["id"] / f"{version}.json",
            raw,
        )
        dataset = normalize_historical_response(
            site_input=source_site,
            raw=raw,
            settings=settings,
            request_url=request_url,
            version=version,
            retrieved_at=retrieved_at,
        )
        dataset = aggregate_historical_climate(dataset, settings)
        validate_climate_dataset(dataset)

        write_json_atomic(
            settings.staging_dir / "climate" / site["id"] / version / "dataset.json",
            dataset,
        )
        outputs.append(export_versioned_dataset(dataset, settings.exports_dir))

    return outputs
