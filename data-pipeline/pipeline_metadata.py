"""Small metadata helpers shared by acquisition and publication stages."""

from __future__ import annotations

from datetime import UTC, datetime


def utc_timestamp() -> str:
    """Return an ISO 8601 timestamp with an explicit UTC offset."""
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
