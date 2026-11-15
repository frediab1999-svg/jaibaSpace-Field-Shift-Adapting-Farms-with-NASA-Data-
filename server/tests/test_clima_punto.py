from datetime import date, timedelta

from app.main import app
from app.modules.climate.punto import ClimaPuntoService, clima_punto_service, procesar


def _raw(anios=(2023, 2024), seco=("06-10", "06-20"), calor=("05-01", "05-04")):
    """Serie sintética: llueve 5 mm al día salvo una racha seca y un episodio de calor por año."""
    lluvia, tmax = {}, {}
    for a in anios:
        d = date(a, 1, 1)
        while d.year == a:
            k = d.strftime("%Y%m%d")
            md = d.strftime("%m-%d")
            lluvia[k] = 0.0 if seco[0] <= md <= seco[1] else 5.0
            tmax[k] = 36.0 if calor[0] <= md <= calor[1] else 31.0
            d += timedelta(1)
    return {
        "header": {"fill_value": -999.0, "api": {"version": "v-test"}},
        "geometry": {"coordinates": [-89.5, 19.8, 90.0]},
        "parameters": {"IMERG_PRECTOT": {"units": "mm/day"}, "T2M_MAX": {"units": "C"}},
        "properties": {"parameter": {"IMERG_PRECTOT": lluvia, "T2M_MAX": tmax}},
    }


def test_procesar_detecta_rachas_y_calor():
    doc = procesar(_raw(), 19.8, -89.5, hoy="2026-11-15")
    assert doc["zona"]["id"] == "punto"
    t = doc["temporadas"][0]
    assert t["completa"] is True
    assert t["rachas"] == [{"inicio": "2023-06-10", "fin": "2023-06-20", "dias": 11}]
    assert t["episodiosCalor"] == [{"inicio": "2023-05-01", "fin": "2023-05-04", "dias": 4}]
    assert t["ventana"]["rachaMasLarga"]["dias"] == 11
    assert doc["resumen"]["aniosCompletos"] == 2


def test_endpoint_usa_cache_y_redondea():
    llamadas = []

    def falso(lat, lon):
        llamadas.append((lat, lon))
        return _raw()

    servicio = ClimaPuntoService(descargar=falso)
    app.dependency_overrides[clima_punto_service] = lambda: servicio
    try:
        from fastapi.testclient import TestClient

        c = TestClient(app)
        r1 = c.get("/api/v1/climate/point", params={"lat": 19.81234, "lon": -89.47021})
        r2 = c.get("/api/v1/climate/point", params={"lat": 19.8149, "lon": -89.4699})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["ubicacion"]["lat"] == 19.81
        assert llamadas == [(19.81, -89.47)]  # la segunda petición sale de la caché
        fuera = c.get("/api/v1/climate/point", params={"lat": 40.0, "lon": -100.0})
        assert fuera.status_code == 422
    finally:
        app.dependency_overrides.pop(clima_punto_service, None)
