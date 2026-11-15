from typing import Literal

from pydantic import BaseModel


class ClimateDatasetInfo(BaseModel):
    dataset_id: str
    zone_id: str
    kind: Literal["historical", "projection"]
    source: str
    scenario: str | None = None
    period_start: int
    period_end: int
    resolution: str | None = None
    version: str
    updated_at: str
