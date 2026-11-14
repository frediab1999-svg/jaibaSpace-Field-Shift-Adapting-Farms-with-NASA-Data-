from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ContributionCreate(BaseModel):
    """Contribución de temporada para estadísticas; no representa una cuenta."""

    model_config = ConfigDict(extra="forbid")

    submission_id: UUID
    consent_id: UUID
    zone_id: str = Field(min_length=1, max_length=80)
    crop_id: str = Field(min_length=1, max_length=80)
    variety_id: str | None = Field(default=None, max_length=100)
    season_year: int = Field(ge=1900, le=2200)
    sowing_date: date | None = None
    harvest_date: date | None = None
    outcome: Literal["good", "regular", "poor"] | None = None
    perceived_cause: str | None = Field(default=None, max_length=120)
    quantity: Decimal | None = Field(default=None, ge=0)
    quantity_unit: str | None = Field(default=None, max_length=40)
    quantity_is_estimate: bool = False


class ContributionAccepted(BaseModel):
    submission_id: UUID
    status: Literal["accepted", "already_received"]
