"""Clima histórico del punto exacto de una parcela (NASA POWER), con la misma lógica que
data-pipeline/clima.py: rachas secas de 3+ días con menos de 1 mm y episodios de calor de
35 °C o más. Devuelve un documento con la misma forma que app/data/clima/<zona>.json, así
que la PWA lo usa sin cambiar el motor.

El servidor hace de intermediario porque la API de NASA POWER no siempre acepta peticiones
directas desde el navegador (CORS) y porque así se guarda en caché: dos parcelas cercanas
comparten la celda de lluvia (~10 km) y no se vuelve a descargar.
"""

from __future__ import annotations

import json
import statistics
import threading
import urllib.request
from collections import OrderedDict
from collections.abc import Callable
from datetime import date, timedelta
from typing import Any

PARAMS = ("IMERG_PRECTOT", "T2M_MAX")
INICIO, FIN = "19980101", "20251231"
UMBRAL_SECO_MM, MIN_RACHA = 1.0, 3
UMBRAL_CALOR_C, MIN_CALOR = 35.0, 1
VENT = ("06-01", "08-31")
BASE = "https://power.larc.nasa.gov/api/temporal/daily/point"

# Península de Yucatán con margen: fuera de aquí el resto del sistema (planes, reglas) no aplica
LIMITES = {"lat": (17.0, 22.5), "lon": (-92.5, -86.0)}


class PuntoFueraDeCobertura(ValueError):
    pass


def redondear(lat: float, lon: float) -> tuple[float, float]:
    """Dos decimales (~1 km): más fino que la celda de lluvia de IMERG (~10 km)."""
    return round(lat, 2), round(lon, 2)


def url(lat: float, lon: float) -> str:
    return (
        f"{BASE}?parameters={','.join(PARAMS)}&community=AG&longitude={lon}&latitude={lat}"
        f"&start={INICIO}&end={FIN}&format=JSON&time-standard=UTC"
    )


def _serie(raw: dict, param: str) -> dict[date, float | None]:
    fill = raw["header"]["fill_value"]
    return {
        date(int(k[:4]), int(k[4:6]), int(k[6:])): (None if v == fill else round(v, 2))
        for k, v in raw["properties"]["parameter"][param].items()
    }


def _corridas(dias, cumple, minimo):
    out, ini, n = [], None, 0
    for d, v in dias + [(None, None)]:
        if v is not None and cumple(v):
            ini, n = (ini or d), n + 1
        else:
            if n >= minimo:
                out.append(
                    {
                        "inicio": ini.isoformat(),
                        "fin": (ini + timedelta(n - 1)).isoformat(),
                        "dias": n,
                    }
                )
            ini, n = None, 0
    return out


def procesar(raw: dict, lat: float, lon: float, hoy: str | None = None) -> dict[str, Any]:
    lluvia, tmax = _serie(raw, PARAMS[0]), _serie(raw, PARAMS[1])
    temporadas = []
    for anio in sorted({d.year for d in lluvia}):
        dl = sorted((d, v) for d, v in lluvia.items() if d.year == anio)
        dt = sorted((d, v) for d, v in tmax.items() if d.year == anio)
        if all(v is None for _, v in dl):
            continue
        vi, vf = date.fromisoformat(f"{anio}-{VENT[0]}"), date.fromisoformat(f"{anio}-{VENT[1]}")
        vent = [(d, v) for d, v in dl if vi <= d <= vf]
        validos = [v for _, v in vent if v is not None]
        rv = _corridas(vent, lambda v: v < UMBRAL_SECO_MM, MIN_RACHA)
        con_dato = sum(v is not None for _, v in dl)
        temporadas.append(
            {
                "anio": anio,
                "completa": con_dato == len(dl) and all(v is not None for _, v in dt),
                "diasConDato": con_dato,
                "diasEsperados": len(dl),
                "ventana": {
                    "diasConDato": len(validos),
                    "diasEsperados": len(vent),
                    "lluviaMm": round(sum(validos), 2),
                    "rachaMasLarga": max(rv, key=lambda r: r["dias"], default=None),
                },
                "rachas": _corridas(dl, lambda v: v < UMBRAL_SECO_MM, MIN_RACHA),
                "episodiosCalor": _corridas(dt, lambda v: v >= UMBRAL_CALOR_C, MIN_CALOR),
            }
        )
    completas = [
        t
        for t in temporadas
        if t["ventana"]["diasConDato"] == t["ventana"]["diasEsperados"]
        and t["ventana"]["rachaMasLarga"]
    ]
    peores = sorted(completas, key=lambda t: -t["ventana"]["rachaMasLarga"]["dias"])[:3]
    validos = lambda s: [d for d, v in s.items() if v is not None]  # noqa: E731
    hoy = hoy or date.today().isoformat()
    version_api = raw.get("header", {}).get("api", {}).get("version")
    unidades = lambda p: raw.get("parameters", {}).get(p, {}).get("units")  # noqa: E731
    fuente = lambda p, producto, res, s: {  # noqa: E731
        "nombre": "NASA POWER Daily API",
        "versionApi": version_api,
        "producto": producto,
        "parametro": p,
        "unidades": unidades(p),
        "resolucionAprox": res,
        "url": url(lat, lon),
        "timeStandard": "UTC",
        "fechaDescarga": hoy,
        "fechaCorte": max(validos(s)).isoformat(),
        "primerDatoValido": min(validos(s)).isoformat(),
    }
    return {
        "version": "0.2",
        "esEjemplo": False,
        "zona": {"id": "punto", "nombre": "Punto de tu parcela", "estado": None},
        "ubicacion": {
            "lat": lat,
            "lon": lon,
            "elevacionM": raw.get("geometry", {}).get("coordinates", [None, None, None])[2],
        },
        "fuentes": {
            "lluvia": fuente(PARAMS[0], "GPM IMERG", "0.1° (~10 km)", lluvia),
            "temperatura": fuente(PARAMS[1], "MERRA-2", "0.5° x 0.625° (~50 km)", tmax),
        },
        "definiciones": {
            "umbralDiaSecoMm": UMBRAL_SECO_MM,
            "rachaMinimaReportadaDias": MIN_RACHA,
            "umbralCalorC": UMBRAL_CALOR_C,
            "calorMinimoReportadoDias": MIN_CALOR,
            "ventanaResumen": {"inicio": VENT[0], "fin": VENT[1]},
            "tratamientoFaltantes": "null; un día null corta la racha o el episodio y no cuenta",
        },
        "temporadas": temporadas,
        "resumen": {
            "aniosCompletos": len(completas),
            "medianaLluviaVentanaMm": round(
                statistics.median(t["ventana"]["lluviaMm"] for t in completas), 2
            )
            if completas
            else None,
            "medianaRachaMasLargaDias": statistics.median(
                t["ventana"]["rachaMasLarga"]["dias"] for t in completas
            )
            if completas
            else None,
            "peoresAnios": [{"anio": t["anio"], **t["ventana"]["rachaMasLarga"]} for t in peores],
        },
    }


def descargar_power(lat: float, lon: float) -> dict:
    with urllib.request.urlopen(url(lat, lon), timeout=120) as r:  # noqa: S310 (URL fija de NASA)
        return json.load(r)


class ClimaPuntoService:
    """Descarga, procesa y guarda en memoria el clima de un punto."""

    def __init__(
        self, descargar: Callable[[float, float], dict] = descargar_power, maximo: int = 256
    ) -> None:
        self._descargar = descargar
        self._maximo = maximo
        self._cache: OrderedDict[tuple[float, float], dict] = OrderedDict()
        self._lock = threading.Lock()

    def obtener(self, lat: float, lon: float) -> dict:
        if not (
            LIMITES["lat"][0] <= lat <= LIMITES["lat"][1]
            and LIMITES["lon"][0] <= lon <= LIMITES["lon"][1]
        ):
            raise PuntoFueraDeCobertura("El punto está fuera de la península de Yucatán.")
        clave = redondear(lat, lon)
        with self._lock:
            if clave in self._cache:
                self._cache.move_to_end(clave)
                return self._cache[clave]
        doc = procesar(self._descargar(*clave), *clave)
        with self._lock:
            self._cache[clave] = doc
            while len(self._cache) > self._maximo:
                self._cache.popitem(last=False)
        return doc


servicio = ClimaPuntoService()


def clima_punto_service() -> ClimaPuntoService:
    return servicio
