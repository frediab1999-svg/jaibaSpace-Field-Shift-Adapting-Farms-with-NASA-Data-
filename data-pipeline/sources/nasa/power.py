"""Minimal, retry-aware client for the NASA POWER daily point endpoint."""

from __future__ import annotations

import json
import time
from datetime import date
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from pipeline_errors import SourceError


def build_daily_point_url(
    base_url: str,
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
    parameters: tuple[str, ...],
    community: str = "AG",
    time_standard: str = "UTC",
) -> str:
    """Build a deterministic NASA POWER daily point request URL."""
    if not -90 <= latitude <= 90:
        raise ValueError("La latitud debe estar entre -90 y 90 grados.")
    if not -180 <= longitude <= 180:
        raise ValueError("La longitud debe estar entre -180 y 180 grados.")
    if start_date > end_date:
        raise ValueError("La fecha inicial no puede ser posterior a la fecha final.")
    if not parameters or any(not parameter.strip() for parameter in parameters):
        raise ValueError("Debe especificarse al menos un parámetro NASA POWER válido.")

    query = urlencode(
        {
            "parameters": ",".join(parameters),
            "community": community,
            "longitude": f"{longitude:.6f}",
            "latitude": f"{latitude:.6f}",
            "start": start_date.strftime("%Y%m%d"),
            "end": end_date.strftime("%Y%m%d"),
            "format": "JSON",
            "time-standard": time_standard,
        }
    )
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{query}"


def fetch_daily_point(url: str, timeout_seconds: int = 180, retries: int = 3) -> dict[str, Any]:
    """Fetch and decode a NASA POWER response, retrying transient failures."""
    if timeout_seconds <= 0:
        raise ValueError("timeout_seconds debe ser mayor que cero.")
    if retries < 0:
        raise ValueError("retries no puede ser negativo.")

    request = Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "jaibaSpace-data-pipeline/0.1"},
    )
    for attempt in range(retries + 1):
        try:
            with urlopen(request, timeout=timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if not isinstance(payload, dict):
                raise SourceError("NASA POWER devolvió una respuesta JSON que no es un objeto.")
            return payload
        except HTTPError as exc:
            if exc.code < 500 or attempt == retries:
                raise SourceError(f"NASA POWER respondió HTTP {exc.code}.") from exc
        except (URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError) as exc:
            if attempt == retries:
                raise SourceError(f"No se pudo obtener o decodificar la respuesta NASA POWER: {exc}") from exc

        time.sleep(min(2**attempt, 8))

    raise SourceError("NASA POWER agotó los intentos de descarga.")
