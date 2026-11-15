from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Contribution(Base):
    __tablename__ = "contributions"

    submission_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    consent_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("consent_records.consent_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    zone_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    crop_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    variety_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    season_year: Mapped[int] = mapped_column(nullable=False, index=True)
    sowing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    harvest_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(20), nullable=True)
    perceived_cause: Mapped[str | None] = mapped_column(String(120), nullable=True)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)
    quantity_unit: Mapped[str | None] = mapped_column(String(40), nullable=True)
    quantity_is_estimate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
