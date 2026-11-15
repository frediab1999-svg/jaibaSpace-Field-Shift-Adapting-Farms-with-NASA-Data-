from typing import Literal

from pydantic import BaseModel


class AggregateStatistic(BaseModel):
    zone_id: str
    crop_id: str
    period: str
    metric: str
    value: float
    method: str
    record_count: int
    updated_at: str


class StatisticsResponse(BaseModel):
    status: Literal["available", "insufficient_sample"]
    zone_id: str
    crop_id: str
    season_year: int
    record_count: int | None
    items: list[AggregateStatistic]
