from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.published.deps import published_service
from app.modules.published.loader import (
    build_documents,
    climate_index_row,
    demo_parcel_records,
    load_demo,
)
from app.modules.published.service import PublishedService

# Los archivos publicados del repositorio: los mismos que carga `python -m app.seed`
PUBLISHED_DIR = Path(__file__).resolve().parents[2] / "app"


class InMemoryPublishedRepository:
    """Misma interfaz que PublishedRepository, con lo que `app.seed` cargaría en la base."""

    def __init__(self, published_dir: Path = PUBLISHED_DIR) -> None:
        documents = build_documents(published_dir)
        loaded_at = datetime(2026, 11, 15, tzinfo=UTC)
        self.documents = {
            d.doc_id: SimpleNamespace(
                doc_id=d.doc_id,
                kind=d.kind,
                format_version=d.format_version,
                sha256=d.sha256,
                size_bytes=d.size_bytes,
                body=d.body,
                source_path=d.source_path,
                loaded_at=loaded_at,
            )
            for d in documents
        }
        by_id = {d.doc_id: d for d in documents}
        self.zonas = by_id["zonas.json"].data["zonas"]
        self.datasets = [
            SimpleNamespace(**climate_index_row(z, by_id[z["archivoClima"]])) for z in self.zonas
        ]
        self.demo = load_demo(published_dir)

    def get_document(self, doc_id):
        return self.documents.get(doc_id)

    def list_documents(self):
        return [self.documents[k] for k in sorted(self.documents)]

    def count_documents(self):
        return len(self.documents)

    def list_climate_datasets(self, zone_id=None, kind=None):
        return [
            d
            for d in self.datasets
            if (not zone_id or d.zone_id == zone_id) and (not kind or d.kind == kind)
        ]

    def get_climate_dataset(self, dataset_id):
        return next((d for d in self.datasets if d.dataset_id == dataset_id), None)

    def get_demo(self):
        perfil = self.demo["perfil"]
        profile = SimpleNamespace(
            profile_id=perfil["id"],
            display_name=perfil["nombreVisible"],
            is_demo=True,
            requires_credentials=False,
            payload={"version": self.demo.get("version"), "nota": self.demo.get("nota")},
        )
        parcels = []
        for parcela in self.demo["parcelas"]:
            ubicacion = parcela.get("ubicacion") or {}
            parcel = SimpleNamespace(
                parcel_id=parcela["id"],
                is_demo=True,
                zone_id=None,
                payload=parcela,
                records=demo_parcel_records(self.demo, parcela["id"]),
            )
            parcels.append((parcel, ubicacion.get("lat"), ubicacion.get("lon")))
        return profile, parcels


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def published_repository() -> InMemoryPublishedRepository:
    return InMemoryPublishedRepository()


@pytest.fixture
def content_client(published_repository) -> TestClient:
    """Cliente con el contenido publicado en memoria: prueba las rutas sin necesitar PostgreSQL."""
    app.dependency_overrides[published_service] = lambda: PublishedService(published_repository)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(published_service, None)
