from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConsentGrant(BaseModel):
    model_config = ConfigDict(extra="forbid")

    consent_id: UUID
    purpose: Literal["collective_statistics"]
    granted: bool
    notice_version: str = Field(min_length=1, max_length=40)
    decided_at: datetime
