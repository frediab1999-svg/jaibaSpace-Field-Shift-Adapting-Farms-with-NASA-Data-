import pytest

from app.modules.catalogs.repository import CatalogRepository
from app.modules.catalogs.service import CatalogService


def test_catalog_service_accepts_supported_catalogs():
    service = CatalogService(CatalogRepository())

    assert service.list_catalog("crops") == []


def test_catalog_service_rejects_unknown_catalogs():
    service = CatalogService(CatalogRepository())

    with pytest.raises(ValueError, match="unknown_catalog"):
        service.list_catalog("unknown")
