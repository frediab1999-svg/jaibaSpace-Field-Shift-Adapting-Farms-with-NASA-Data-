from app.modules.climate.service import ClimateService


def test_climate_service_starts_with_no_unpublished_datasets():
    service = ClimateService()

    assert service.list_datasets("yuc-noroeste") == []
