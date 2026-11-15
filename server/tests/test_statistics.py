from app.modules.statistics.service import StatisticsService


class FakeStatisticsRepository:
    def query_aggregates(self, zone_id, crop_id, period):
        return [
            {
                "zone_id": zone_id,
                "crop_id": crop_id,
                "period": period,
                "metric": "season_count",
                "value": 3,
                "method": "count",
                "record_count": 20,
                "updated_at": "2026-01-01",
            }
        ]


def test_statistics_service_delegates_aggregate_query():
    service = StatisticsService(FakeStatisticsRepository())

    result = service.get_aggregates("yuc-noroeste", "maiz", "2025")

    assert result[0]["record_count"] == 20
    assert result[0]["zone_id"] == "yuc-noroeste"
