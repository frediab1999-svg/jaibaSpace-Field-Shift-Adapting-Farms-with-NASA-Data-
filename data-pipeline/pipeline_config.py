"""Configuration loading for the jaibaSpace data pipeline."""

from __future__ import annotations

import math
import os
import tomllib
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any


PIPELINE_ROOT = Path(__file__).resolve().parent


def _load_env_file(path: Path) -> None:
    """Load simple KEY=VALUE entries without overriding the process environment."""
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", maxsplit=1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key and key not in os.environ:
            os.environ[key] = value


def _path_from_root(value: str, root: Path) -> Path:
    path = Path(value).expanduser()
    return path.resolve() if path.is_absolute() else (root / path).resolve()


def _read_toml(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"No existe el archivo de configuración: {path}")
    with path.open("rb") as file:
        return tomllib.load(file)


@dataclass(frozen=True, slots=True)
class PipelineSettings:
    root: Path
    config_file: Path
    datasets_file: Path
    sites_file: Path
    raw_dir: Path
    staging_dir: Path
    exports_dir: Path
    nasa_power_base_url: str
    nasa_power_community: str
    time_standard: str
    timeout_seconds: int
    retries: int
    start_date: date
    end_date: date
    parameters: tuple[str, ...]
    dry_day_threshold_mm: float
    minimum_dry_streak_days: int
    summary_window_start: str
    summary_window_end: str
    temperature_usage: str
    dataset_metadata: dict[str, Any]


def load_settings(config_file: str | Path | None = None) -> PipelineSettings:
    """Load TOML configuration, then apply documented environment overrides."""
    _load_env_file(PIPELINE_ROOT / ".env")

    config_value = config_file or os.getenv("PIPELINE_CONFIG", "config/pipeline.toml")
    config_path = _path_from_root(str(config_value), PIPELINE_ROOT)
    data = _read_toml(config_path)

    dataset_path = PIPELINE_ROOT / "config" / "datasets.toml"
    dataset_metadata = _read_toml(dataset_path)

    paths = data.get("paths", {})
    nasa = data.get("nasa_power", {})
    climate = data.get("climate", {})
    historical = climate.get("historical", {})
    summary = climate.get("summary", {})

    def env_path(name: str, config_key: str) -> Path:
        value = os.getenv(name, str(paths[config_key]))
        return _path_from_root(value, PIPELINE_ROOT)

    start = date.fromisoformat(os.getenv("PIPELINE_START_DATE", historical["start_date"]))
    end = date.fromisoformat(os.getenv("PIPELINE_END_DATE", historical["end_date"]))
    if start > end:
        raise ValueError("PIPELINE_START_DATE debe ser anterior o igual a PIPELINE_END_DATE.")

    base_url = os.getenv("NASA_POWER_BASE_URL", nasa["base_url"]).rstrip("?")
    timeout = int(os.getenv("NASA_POWER_TIMEOUT_SECONDS", nasa["timeout_seconds"]))
    retries = int(os.getenv("NASA_POWER_RETRIES", nasa["retries"]))
    if timeout <= 0:
        raise ValueError("NASA_POWER_TIMEOUT_SECONDS debe ser mayor que cero.")
    if retries < 0:
        raise ValueError("NASA_POWER_RETRIES no puede ser negativo.")
    parameters = tuple(historical.get("parameters", ()))
    dry_threshold = float(summary["dry_day_threshold_mm"])
    minimum_streak = int(summary["minimum_dry_streak_days"])
    if not parameters:
        raise ValueError("Debe configurarse al menos un parámetro climático.")
    if not math.isfinite(dry_threshold) or dry_threshold < 0:
        raise ValueError("dry_day_threshold_mm debe ser finito y no negativo.")
    if minimum_streak < 1:
        raise ValueError("minimum_dry_streak_days debe ser mayor que cero.")

    window_start = summary["summary_window_start"]
    window_end = summary["summary_window_end"]
    temperature_usage = str(summary["temperature_usage"]).strip()
    if not temperature_usage:
        raise ValueError("temperature_usage debe describir el uso de la temperatura.")
    # Validar MM-DD usando un año bisiesto para aceptar el 29 de febrero.
    date.fromisoformat(f"2000-{window_start}")
    date.fromisoformat(f"2000-{window_end}")
    if window_start > window_end:
        raise ValueError("La ventana de resumen no puede cruzar el cambio de año.")

    return PipelineSettings(
        root=PIPELINE_ROOT,
        config_file=config_path,
        datasets_file=dataset_path,
        sites_file=env_path("PIPELINE_SITES_FILE", "sites_file"),
        raw_dir=env_path("PIPELINE_RAW_DIR", "raw_dir"),
        staging_dir=env_path("PIPELINE_STAGING_DIR", "staging_dir"),
        exports_dir=env_path("PIPELINE_EXPORTS_DIR", "exports_dir"),
        nasa_power_base_url=base_url,
        nasa_power_community=os.getenv("NASA_POWER_COMMUNITY", nasa["community"]),
        time_standard=os.getenv("PIPELINE_TIME_STANDARD", nasa["time_standard"]),
        timeout_seconds=timeout,
        retries=retries,
        start_date=start,
        end_date=end,
        parameters=parameters,
        dry_day_threshold_mm=dry_threshold,
        minimum_dry_streak_days=minimum_streak,
        summary_window_start=window_start,
        summary_window_end=window_end,
        temperature_usage=temperature_usage,
        dataset_metadata=dataset_metadata,
    )
