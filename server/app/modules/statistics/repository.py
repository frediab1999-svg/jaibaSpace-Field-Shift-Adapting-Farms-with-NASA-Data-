from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.contributions.model import Contribution


class StatisticsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def query_aggregates(
        self, zone_id: str, crop_id: str, season_year: int
    ) -> tuple[int, list[tuple[str | None, int]]]:
        filters = (
            Contribution.zone_id == zone_id,
            Contribution.crop_id == crop_id,
            Contribution.season_year == season_year,
        )
        total = self.db.scalar(select(func.count()).select_from(Contribution).where(*filters)) or 0
        grouped = self.db.execute(
            select(Contribution.outcome, func.count())
            .where(*filters)
            .group_by(Contribution.outcome)
        ).all()
        return total, [(outcome, count) for outcome, count in grouped]
