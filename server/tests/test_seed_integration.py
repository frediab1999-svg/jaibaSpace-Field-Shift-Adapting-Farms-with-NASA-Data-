"""Carga de demo contra PostgreSQL/PostGIS real.

Solo corre cuando se pide, porque escribe en la base a la que apunta DATABASE_URL:

    RUN_DB_TESTS=1 pytest tests/test_seed_integration.py        (bash)
    $env:RUN_DB_TESTS = "1"; pytest tests/test_seed_integration.py   (PowerShell)

Necesita la base levantada y migrada (`alembic upgrade head`).
"""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_DB_TESTS") != "1", reason="RUN_DB_TESTS=1 para probar contra PostgreSQL"
)

PUBLISHED_DIR = Path(__file__).resolve().parents[2] / "app"
TABLES = ("published_documents", "zones", "climate_datasets", "demo_profiles", "demo_parcels")


@pytest.fixture
def db():
    from app.database.session import SessionLocal  # noqa: PLC0415

    with SessionLocal() as session:
        yield session


def _counts(db) -> dict[str, int]:
    return {t: db.scalar(text(f"SELECT count(*) FROM {t}")) for t in TABLES}  # noqa: S608


def test_seed_is_idempotent(db):
    from app.seed import seed  # noqa: PLC0415

    first = seed(db, PUBLISHED_DIR)
    counts = _counts(db)
    hashes = dict(db.execute(text("SELECT doc_id, sha256 FROM published_documents")).all())
    second = seed(db, PUBLISHED_DIR)

    assert (
        _counts(db)
        == counts
        == {
            "published_documents": 11,
            "zones": 3,
            "climate_datasets": 3,
            "demo_profiles": 1,
            "demo_parcels": 3,
        }
    )
    assert dict(db.execute(text("SELECT doc_id, sha256 FROM published_documents")).all()) == hashes
    assert second["bundle_version"] == first["bundle_version"]
    assert all(second[t]["nuevas"] == 0 and second[t]["borradas"] == 0 for t in TABLES)


def test_postgis_points_keep_longitude_and_latitude_in_order(db):
    from app.modules.published.repository import PublishedRepository  # noqa: PLC0415

    zones = {z["zone_id"]: (z["lat"], z["lon"]) for z in PublishedRepository(db).list_zone_points()}

    assert zones == {
        "yuc-sur": (19.8122, -89.4702),
        "camp-chenes": (19.75, -89.84),
        "qroo-centro": (19.58, -88.05),
    }
    # La parcela de demo de Tekax cae en el punto de su zona (distancia 0 en PostGIS)
    distance = db.scalar(
        text(
            "SELECT ST_Distance(p.location::geography, z.reference_point::geography) "
            "FROM demo_parcels p JOIN zones z ON z.zone_id = p.zone_id WHERE p.parcel_id = 'ej-cenote'"
        )
    )
    assert distance == 0


def test_api_serves_from_the_database(db):
    from app.main import app  # noqa: PLC0415
    from app.modules.published.model import PublishedDocument  # noqa: PLC0415

    with TestClient(app) as client:
        ready = client.get("/api/v1/ready")
        manifest = client.get("/api/v1/bundle").json()
        demo = client.get("/api/v1/demo").json()

    assert ready.status_code == 200
    assert ready.json()["published_documents"] == 11
    assert len(manifest["documents"]) == db.scalar(
        select(func.count()).select_from(PublishedDocument)
    )
    assert demo["parcelas"][0]["zonaIdServidor"] == "yuc-sur"
    assert (demo["parcelas"][0]["ubicacion"]["lat"], demo["parcelas"][0]["ubicacion"]["lon"]) == (
        19.8122,
        -89.4702,
    )
