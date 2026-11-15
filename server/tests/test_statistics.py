from app.modules.statistics.service import StatisticsService


class FakeStatisticsRepository:
    """Misma forma que StatisticsRepository.query_aggregates: (total, [(resultado, cuenta)])."""

    def __init__(self, total, outcomes):
        self.total = total
        self.outcomes = outcomes

    def query_aggregates(self, zone_id, crop_id, season_year):
        return self.total, self.outcomes


def test_statistics_service_reports_outcome_counts_when_the_sample_is_enough():
    service = StatisticsService(FakeStatisticsRepository(20, [("good", 12), ("poor", 8)]))

    result = service.get_aggregates("yuc-sur", "maiz", 2025)

    assert result.status == "available"
    assert result.record_count == 20
    assert result.zone_id == "yuc-sur"
    assert {item.metric: item.value for item in result.items} == {
        "outcome_good_count": 12,
        "outcome_poor_count": 8,
    }


def test_statistics_service_hides_small_samples():
    service = StatisticsService(FakeStatisticsRepository(3, [("good", 3)]))

    result = service.get_aggregates("yuc-sur", "maiz", 2025)

    assert result.status == "insufficient_sample"
    assert result.record_count is None
    assert result.items == []
