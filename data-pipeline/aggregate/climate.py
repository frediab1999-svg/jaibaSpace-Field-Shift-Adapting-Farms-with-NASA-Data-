"""Calculate transparent rainfall and descriptive temperature summaries."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from datetime import date, timedelta
from typing import Any

from pipeline_config import PipelineSettings


def _dates_between(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def _events(
    observations: list[Mapping[str, Any]],
    condition: Callable[[float], bool],
    minimum_days: int,
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    start: date | None = None
    previous: date | None = None
    length = 0

    def finish() -> None:
        if start is not None and length >= minimum_days:
            events.append(
                {
                    "start": start.isoformat(),
                    "end": previous.isoformat() if previous else start.isoformat(),
                    "days": length,
                }
            )

    for observation in observations:
        current = date.fromisoformat(str(observation["date"]))
        value = observation.get("value")
        qualifies = value is not None and condition(float(value))
        if qualifies and (previous is None or current == previous + timedelta(days=1)):
            if start is None:
                start = current
            previous = current
            length += 1
            continue

        finish()
        start = current if qualifies else None
        previous = current if qualifies else None
        length = 1 if qualifies else 0

    finish()
    return events


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)
    return start, end


def _monthly_climatology(
    dataset: Mapping[str, Any],
) -> list[dict[str, Any]]:
    period = dataset["period"]
    period_start = date.fromisoformat(period["start"])
    period_end = date.fromisoformat(period["end"])
    parameters = dataset["parameters"]
    precipitation = {
        item["date"]: item["value"]
        for item in parameters["precipitation"]["observations"]
    }
    maximum_temperature = {
        item["date"]: item["value"]
        for item in parameters["maximum_temperature"]["observations"]
    }
    minimum_temperature = {
        item["date"]: item["value"]
        for item in parameters["minimum_temperature"]["observations"]
    }
    first_year, last_year = period_start.year, period_end.year
    climatology: list[dict[str, Any]] = []

    for month in range(1, 13):
        monthly_precipitation_totals: list[float] = []
        maximum_values: list[float] = []
        minimum_values: list[float] = []
        expected_periods = 0
        expected_days = 0
        maximum_valid_days = 0
        minimum_valid_days = 0

        for year in range(first_year, last_year + 1):
            month_start, month_end = _month_bounds(year, month)
            current_start = max(month_start, period_start)
            current_end = min(month_end, period_end)
            if current_start > current_end:
                continue

            expected_periods += 1
            month_dates = list(_dates_between(current_start, current_end))
            expected_days += len(month_dates)
            rain_values = [precipitation.get(day.isoformat()) for day in month_dates]
            if rain_values and all(value is not None for value in rain_values):
                monthly_precipitation_totals.append(sum(float(value) for value in rain_values))

            for day in month_dates:
                maximum_value = maximum_temperature.get(day.isoformat())
                minimum_value = minimum_temperature.get(day.isoformat())
                if maximum_value is not None:
                    maximum_values.append(float(maximum_value))
                    maximum_valid_days += 1
                if minimum_value is not None:
                    minimum_values.append(float(minimum_value))
                    minimum_valid_days += 1

        climatology.append(
            {
                "month": month,
                "expected_periods": expected_periods,
                "precipitation_mean_monthly_total_mm": round(
                    sum(monthly_precipitation_totals) / len(monthly_precipitation_totals), 2
                )
                if monthly_precipitation_totals
                else None,
                "precipitation_complete_periods": len(monthly_precipitation_totals),
                "maximum_temperature_mean_daily_c": round(
                    sum(maximum_values) / len(maximum_values), 2
                )
                if maximum_values
                else None,
                "maximum_temperature_valid_days": maximum_valid_days,
                "maximum_temperature_expected_days": expected_days,
                "minimum_temperature_mean_daily_c": round(
                    sum(minimum_values) / len(minimum_values), 2
                )
                if minimum_values
                else None,
                "minimum_temperature_valid_days": minimum_valid_days,
                "minimum_temperature_expected_days": expected_days,
            }
        )

    return climatology


def aggregate_historical_climate(
    dataset: dict[str, Any], settings: PipelineSettings
) -> dict[str, Any]:
    """Attach monthly climatology and June–August rainfall summaries.

    Temperature remains descriptive: this aggregation does not classify heat
    episodes or infer crop stress without validated agronomic rules.
    """
    parameters = dataset["parameters"]
    precipitation = parameters["precipitation"]["observations"]
    maximum_temperature = parameters["maximum_temperature"]["observations"]
    minimum_temperature = parameters["minimum_temperature"]["observations"]
    precipitation_by_date = {item["date"]: item["value"] for item in precipitation}
    years = range(settings.start_date.year, settings.end_date.year + 1)
    summaries: list[dict[str, Any]] = []

    start_month, start_day = (int(part) for part in settings.summary_window_start.split("-"))
    end_month, end_day = (int(part) for part in settings.summary_window_end.split("-"))
    for year in years:
        window_start = date(year, start_month, start_day)
        window_end = date(year, end_month, end_day)
        if year == settings.start_date.year:
            window_start = max(window_start, settings.start_date)
        if year == settings.end_date.year:
            window_end = min(window_end, settings.end_date)
        if window_start > window_end:
            continue
        window_dates = list(_dates_between(window_start, window_end))
        rain_values = [precipitation_by_date.get(day.isoformat()) for day in window_dates]
        valid_rain_days = sum(value is not None for value in rain_values)
        complete_window = bool(window_dates) and valid_rain_days == len(window_dates)
        window_observations = [
            {"date": day.isoformat(), "value": precipitation_by_date.get(day.isoformat())}
            for day in window_dates
        ]
        dry_streaks = (
            _events(
                window_observations,
                lambda value: value < settings.dry_day_threshold_mm,
                settings.minimum_dry_streak_days,
            )
            if complete_window
            else []
        )
        longest_dry_streak = (
            max(dry_streaks, key=lambda event: event["days"]) if dry_streaks else None
        )

        rain_year = [item for item in precipitation if item["date"].startswith(f"{year}-")]
        maximum_year = [
            item for item in maximum_temperature if item["date"].startswith(f"{year}-")
        ]
        minimum_year = [
            item for item in minimum_temperature if item["date"].startswith(f"{year}-")
        ]
        summaries.append(
            {
                "year": year,
                "coverage": {
                    "precipitation_valid_days": sum(
                        item["value"] is not None for item in rain_year
                    ),
                    "precipitation_expected_days": len(rain_year),
                    "maximum_temperature_valid_days": sum(
                        item["value"] is not None for item in maximum_year
                    ),
                    "maximum_temperature_expected_days": len(maximum_year),
                    "minimum_temperature_valid_days": sum(
                        item["value"] is not None for item in minimum_year
                    ),
                    "minimum_temperature_expected_days": len(minimum_year),
                },
                "summary_window": {
                    "start": window_start.isoformat(),
                    "end": window_end.isoformat(),
                    "precipitation_valid_days": valid_rain_days,
                    "precipitation_expected_days": len(window_dates),
                    "complete": complete_window,
                    "precipitation_mm": round(sum(float(value) for value in rain_values), 2)
                    if complete_window
                    else None,
                    "dry_streaks": dry_streaks,
                    "longest_dry_streak": longest_dry_streak,
                },
            }
        )

    dataset["derived"] = {
        "method": (
            "Monthly precipitation is the mean of complete monthly totals; temperature "
            "is the mean of valid daily extrema. June–August dry streaks use the configured "
            "rain threshold and minimum duration; incomplete windows are not summarized."
        ),
        "monthly_climatology": _monthly_climatology(dataset),
        "annual_summaries": summaries,
    }
    return dataset
