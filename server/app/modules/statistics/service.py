from datetime import UTC, datetime

from app.core.config import get_settings
from app.modules.statistics.repository import StatisticsRepository
from app.modules.statistics.schemas import AggregateStatistic, StatisticsResponse


class StatisticsService:
    def __init__(self, repository: StatisticsRepository) -> None:
        self.repository = repository

    def get_aggregates(
        self, zone_id: str, crop_id: str, season_year: int
    ) -> StatisticsResponse:
        total, outcomes = self.repository.query_aggregates(zone_id, crop_id, season_year)
        if total < get_settings().min_stats_sample_size:
            return StatisticsResponse(
                status="insufficient_sample",
                zone_id=zone_id,
                crop_id=crop_id,
                season_year=season_year,
                record_count=None,
                items=[],
            )

        updated_at = datetime.now(UTC).isoformat()
        items = [
            AggregateStatistic(
                zone_id=zone_id,
                crop_id=crop_id,
                period=str(season_year),
                metric=f"outcome_{outcome or 'unspecified'}_count",
                value=count,
                method="Conteo de resultados autorreportados por categoría.",
                record_count=total,
                updated_at=updated_at,
            )
            for outcome, count in outcomes
        ]
        return StatisticsResponse(
            status="available",
            zone_id=zone_id,
            crop_id=crop_id,
            season_year=season_year,
            record_count=total,
            items=items,
        )
