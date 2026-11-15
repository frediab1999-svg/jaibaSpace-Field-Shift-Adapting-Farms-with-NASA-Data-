"""Demo-site distance helpers; these are not authoritative zone boundaries."""

from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any

from normalize.geography import normalize_site
from pipeline_errors import DataValidationError


EARTH_MEAN_RADIUS_KM = 6371.0088


def haversine_km(latitude_a: float, longitude_a: float, latitude_b: float, longitude_b: float) -> float:
    """Calculate great-circle distance between two WGS84 latitude/longitude points."""
    for latitude, longitude in ((latitude_a, longitude_a), (latitude_b, longitude_b)):
        if not math.isfinite(latitude) or not -90 <= latitude <= 90:
            raise ValueError("Las latitudes deben estar entre -90 y 90 grados.")
        if not math.isfinite(longitude) or not -180 <= longitude <= 180:
            raise ValueError("Las longitudes deben estar entre -180 y 180 grados.")

    lat_a, lon_a, lat_b, lon_b = map(
        math.radians, (latitude_a, longitude_a, latitude_b, longitude_b)
    )
    delta_lat = lat_b - lat_a
    delta_lon = lon_b - lon_a
    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat_a) * math.cos(lat_b) * math.sin(delta_lon / 2) ** 2
    )
    arc = 2 * math.atan2(math.sqrt(haversine), math.sqrt(max(0.0, 1.0 - haversine)))
    return EARTH_MEAN_RADIUS_KM * arc


def nearest_reference_site(
    latitude: float,
    longitude: float,
    sites: list[Mapping[str, Any]],
) -> dict[str, Any]:
    """Return the closest configured demo site and its distance.

    The result is a nearest-site suggestion, not a point-in-polygon zone
    classification. The project still needs authoritative zone boundaries.
    """
    if not sites:
        raise DataValidationError(["No hay sitios de demostración configurados."])
    candidates: list[tuple[float, dict[str, Any]]] = []
    for raw_site in sites:
        site = normalize_site(raw_site)
        distance = haversine_km(
            latitude, longitude, site["latitude"], site["longitude"]
        )
        candidates.append((distance, site))

    distance, site = min(candidates, key=lambda candidate: (candidate[0], candidate[1]["id"]))
    return {
        "site_id": site["id"],
        "zone_id": site["zone_id"],
        "municipality": site["municipality"],
        "state": site["state"],
        "distance_to_site_km": round(distance, 3),
        "method": "nearest_demo_site",
        "authoritative_boundary_used": False,
    }
