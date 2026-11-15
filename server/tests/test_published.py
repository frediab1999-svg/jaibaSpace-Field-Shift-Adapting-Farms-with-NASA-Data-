"""Contenido publicado: archivos → documentos → rutas que consume la PWA."""

import hashlib
import json
import shutil
from pathlib import Path

import pytest

from app.modules.published.loader import (
    PublishedContentError,
    build_documents,
    bundle_version,
    climate_index_row,
    load_demo,
)

PUBLISHED_DIR = Path(__file__).resolve().parents[2] / "app"

ZONAS = {
    "yuc-sur": (19.8122, -89.4702),
    "camp-chenes": (19.75, -89.84),
    "qroo-centro": (19.58, -88.05),
}


def test_build_documents_covers_everything_the_pwa_needs():
    ids = {d.doc_id for d in build_documents(PUBLISHED_DIR)}

    assert {"zonas.json", "planes.json", "reglas.json"} <= ids
    assert {f"clima/{z}.json" for z in ZONAS} <= ids
    assert {
        f"catalogos/{n}.json" for n in ("crops", "seeds", "soils", "municipios", "listas")
    } <= ids


def test_zone_dataset_correspondence_and_coordinate_order():
    documents = {d.doc_id: d for d in build_documents(PUBLISHED_DIR)}
    zonas = documents["zonas.json"].data["zonas"]

    assert {z["id"]: (z["punto"]["lat"], z["punto"]["lon"]) for z in zonas} == ZONAS
    for zona in zonas:
        clima = documents[zona["archivoClima"]].data
        assert clima["zona"]["id"] == zona["id"]
        assert (clima["ubicacion"]["lat"], clima["ubicacion"]["lon"]) == ZONAS[zona["id"]]
        row = climate_index_row(zona, documents[zona["archivoClima"]])
        assert (row["period_start"], row["period_end"], row["complete_years"]) == (1998, 2025, 28)
        assert row["time_standard"] == "UTC"
        assert row["parameters"]["lluvia"]["parametro"] == "IMERG_PRECTOT"
        assert row["parameters"]["temperatura"]["parametro"] == "T2M_MAX"
        # En la URL de NASA la latitud y la longitud van con nombre: no se pueden invertir
        lat, lon = ZONAS[zona["id"]]
        assert f"longitude={lon}&latitude={lat}&" in row["parameters"]["url"]


def test_loading_twice_gives_identical_fingerprints():
    first = build_documents(PUBLISHED_DIR)
    second = build_documents(PUBLISHED_DIR)

    assert [(d.doc_id, d.sha256) for d in first] == [(d.doc_id, d.sha256) for d in second]
    assert bundle_version(first) == bundle_version(second)


def test_fingerprints_do_not_depend_on_windows_line_endings(tmp_path):
    copy = tmp_path / "app"
    shutil.copytree(PUBLISHED_DIR / "data", copy / "data")
    for path in (copy / "data").rglob("*.json"):
        path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"))

    assert bundle_version(build_documents(copy)) == bundle_version(build_documents(PUBLISHED_DIR))


def test_incoherent_files_are_rejected_before_loading(tmp_path):
    copy = tmp_path / "app"
    shutil.copytree(PUBLISHED_DIR / "data", copy / "data")
    # El clima de otra zona con el nombre de archivo de Tekax: mismo formato, otro punto
    shutil.copyfile(copy / "data/clima/camp-chenes.json", copy / "data/clima/yuc-sur.json")

    with pytest.raises(PublishedContentError, match="es de la zona camp-chenes"):
        build_documents(copy)


def test_missing_value_marker_is_rejected(tmp_path):
    copy = tmp_path / "app"
    shutil.copytree(PUBLISHED_DIR / "data", copy / "data")
    path = copy / "data/clima/yuc-sur.json"
    path.write_text(
        path.read_text(encoding="utf-8").replace('"lluviaMm": 429.87', '"lluviaMm": -999.0'),
        encoding="utf-8",
    )

    with pytest.raises(PublishedContentError, match="-999"):
        build_documents(copy)


def test_demo_profile_is_fictional_and_has_no_credentials():
    demo = load_demo(PUBLISHED_DIR)

    assert demo["perfil"]["esDemo"] is True
    assert demo["perfil"]["requiereCredenciales"] is False
    primera = demo["parcelas"][0]
    assert (primera["ubicacion"]["lat"], primera["ubicacion"]["lon"]) == ZONAS["yuc-sur"]
    assert primera["municipioId"] == "tekax"


def test_bundle_manifest_matches_what_each_route_serves(content_client):
    manifest = content_client.get("/api/v1/bundle").json()

    assert len(manifest["bundle_version"]) == 12
    assert len(manifest["documents"]) == 11
    for doc in manifest["documents"]:
        response = content_client.get(f"/api/v1{doc['url']}")
        assert response.status_code == 200, doc["doc_id"]
        assert len(response.content) == doc["bytes"], doc["doc_id"]
        assert hashlib.sha256(response.content).hexdigest() == doc["sha256"], doc["doc_id"]
        json.loads(response.content)


def test_catalog_route_keeps_the_catalog_items_count_contract(content_client):
    crops = content_client.get("/api/v1/catalogs/crops").json()

    assert crops["catalog"] == "crops"
    assert crops["count"] == len(crops["items"]) == 6
    assert {c["id"] for c in crops["items"]} >= {"maiz", "canavalia", "soya"}
    stages = content_client.get("/api/v1/catalogs/stages").json()
    assert {"id": "maiz:intermedia", "from_day": 80, "to_day": 129}.items() <= next(
        s for s in stages["items"] if s["id"] == "maiz:intermedia"
    ).items()


def test_unknown_catalog_returns_the_api_error_format(content_client):
    response = content_client.get("/api/v1/catalogs/unknown")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "unknown_catalog"


def test_climate_index_and_content_for_the_pilot_zone(content_client):
    index = content_client.get("/api/v1/climate/datasets", params={"zone_id": "yuc-sur"}).json()

    assert index["count"] == 1
    info = index["items"][0]
    assert info["dataset_id"] == "yuc-sur-historical-nasa-power"
    assert (info["kind"], info["period_start"], info["period_end"]) == ("historical", 1998, 2025)
    assert info["cutoff_date"] == "2025-12-31"
    content = content_client.get(f"/api/v1{info['content_url']}").json()
    assert content["zona"]["id"] == "yuc-sur"
    assert len(content["temporadas"]) == 28
    assert (
        content_client.get("/api/v1/climate/datasets", params={"kind": "projection"}).json()[
            "count"
        ]
        == 0
    )
    assert content_client.get("/api/v1/climate/datasets/nope/content").status_code == 404


def test_plans_publish_the_three_demo_options_and_rules_their_crops(content_client):
    planes = content_client.get("/api/v1/strategies/plans").json()
    reglas = content_client.get("/api/v1/strategies/rules").json()

    por_id = {p["id"]: p for p in planes["planes"]}
    assert {"actual", "milpa-canavalia", "cobertura"} <= set(por_id)
    intercalada = por_id["milpa-canavalia"]["ciclos"][0]["cultivos"]
    assert [c["cultivo"] for c in intercalada] == ["maiz", "canavalia"]
    assert intercalada[1]["tipoFin"] == "fin_cobertura"
    assert {"maiz", "canavalia", "soya"} <= set(reglas["cultivos"])


def test_demo_route_serves_the_fictional_profile_and_tekax_parcel(content_client):
    demo = content_client.get("/api/v1/demo").json()

    assert demo["esEjemplo"] is True
    assert demo["perfil"] == {
        "id": "demo-productor",
        "nombreVisible": "don Celestino",
        "esDemo": True,
        "requiereCredenciales": False,
    }
    parcela = demo["parcelas"][0]
    assert parcela["esDemo"] is True
    assert (parcela["ubicacion"]["lat"], parcela["ubicacion"]["lon"]) == ZONAS["yuc-sur"]
    assert any(s["parcelaId"] == parcela["id"] for s in demo["siembras"])


def test_cors_allows_the_pwa_on_localhost_and_on_the_local_network(content_client):
    for origin in (
        "http://localhost:5173",
        "http://192.168.1.20:5173",
        "http://10.100.11.239:4173",
    ):
        response = content_client.get("/api/v1/bundle", headers={"Origin": origin})
        assert response.headers.get("access-control-allow-origin") == origin, origin
    response = content_client.get("/api/v1/bundle", headers={"Origin": "https://example.com"})
    assert "access-control-allow-origin" not in response.headers
