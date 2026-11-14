# data-pipeline/clima.py — uso: python clima.py ../app/data
# Lee <dir>/zonas.json, descarga NASA POWER por zona y escribe <dir>/clima/<zona>.json
# (escribe en UTF-8; no uses ">" en Windows, porque guarda en cp1252)
import json, statistics, sys, urllib.request
from datetime import date, timedelta
from pathlib import Path

PARAMS = ("IMERG_PRECTOT", "T2M_MAX")
INICIO, FIN = "19980101", "20251231"
UMBRAL_SECO_MM, MIN_RACHA = 1.0, 3       # se reportan rachas secas de 3+ días
UMBRAL_CALOR_C, MIN_CALOR = 35.0, 1      # se reportan episodios de calor de 1+ día
VENT = ("06-01", "08-31")
BASE = "https://power.larc.nasa.gov/api/temporal/daily/point"

def url(lat, lon):
    return (f"{BASE}?parameters={','.join(PARAMS)}&community=AG&longitude={lon}&latitude={lat}"
            f"&start={INICIO}&end={FIN}&format=JSON&time-standard=UTC")

def serie(raw, param):
    fill = raw["header"]["fill_value"]
    return {date(int(k[:4]), int(k[4:6]), int(k[6:])): (None if v == fill else round(v, 2))
            for k, v in raw["properties"]["parameter"][param].items()}

def corridas(dias, cumple, minimo):
    """Días consecutivos que cumplen la condición. Un null corta la corrida."""
    out, ini, n = [], None, 0
    for d, v in dias + [(None, None)]:
        if v is not None and cumple(v):
            ini, n = (ini or d), n + 1
        else:
            if n >= minimo:
                out.append({"inicio": ini.isoformat(), "fin": (ini + timedelta(n - 1)).isoformat(), "dias": n})
            ini, n = None, 0
    return out

def procesar(zona, raw):
    lluvia, tmax = serie(raw, PARAMS[0]), serie(raw, PARAMS[1])
    temporadas = []
    for anio in sorted({d.year for d in lluvia}):
        dl = sorted((d, v) for d, v in lluvia.items() if d.year == anio)
        dt = sorted((d, v) for d, v in tmax.items() if d.year == anio)
        if all(v is None for _, v in dl):
            continue
        vi, vf = date.fromisoformat(f"{anio}-{VENT[0]}"), date.fromisoformat(f"{anio}-{VENT[1]}")
        vent = [(d, v) for d, v in dl if vi <= d <= vf]
        validos = [v for _, v in vent if v is not None]
        rv = corridas(vent, lambda v: v < UMBRAL_SECO_MM, MIN_RACHA)
        con_dato = sum(v is not None for _, v in dl)
        temporadas.append({
            "anio": anio,
            "completa": con_dato == len(dl) and all(v is not None for _, v in dt),
            "diasConDato": con_dato, "diasEsperados": len(dl),
            "ventana": {"diasConDato": len(validos), "diasEsperados": len(vent),
                        "lluviaMm": round(sum(validos), 2),
                        "rachaMasLarga": max(rv, key=lambda r: r["dias"], default=None)},
            "rachas": corridas(dl, lambda v: v < UMBRAL_SECO_MM, MIN_RACHA),
            "episodiosCalor": corridas(dt, lambda v: v >= UMBRAL_CALOR_C, MIN_CALOR),
        })
    completas = [t for t in temporadas
                 if t["ventana"]["diasConDato"] == t["ventana"]["diasEsperados"] and t["ventana"]["rachaMasLarga"]]
    peores = sorted(completas, key=lambda t: -t["ventana"]["rachaMasLarga"]["dias"])[:3]
    corte = lambda s: max(d for d, v in s.items() if v is not None).isoformat()
    primero = lambda s: min(d for d, v in s.items() if v is not None).isoformat()
    hoy = date.today().isoformat()
    return {
        "version": "0.2", "esEjemplo": False,
        "zona": {"id": zona["id"], "nombre": zona["nombre"], "estado": zona["estado"]},
        "ubicacion": {"lat": zona["punto"]["lat"], "lon": zona["punto"]["lon"],
                      "elevacionM": raw["geometry"]["coordinates"][2]},
        "fuentes": {
            "lluvia": {"nombre": "NASA POWER Daily API", "versionApi": raw["header"]["api"]["version"],
                       "producto": "GPM IMERG", "parametro": PARAMS[0],
                       "unidades": raw["parameters"][PARAMS[0]]["units"], "resolucionAprox": "0.1° (~10 km)",
                       "url": url(zona["punto"]["lat"], zona["punto"]["lon"]), "timeStandard": "UTC",
                       "fechaDescarga": hoy, "fechaCorte": corte(lluvia), "primerDatoValido": primero(lluvia)},
            "temperatura": {"nombre": "NASA POWER Daily API", "versionApi": raw["header"]["api"]["version"],
                            "producto": "MERRA-2", "parametro": PARAMS[1],
                            "unidades": raw["parameters"][PARAMS[1]]["units"], "resolucionAprox": "0.5° x 0.625° (~50 km)",
                            "url": url(zona["punto"]["lat"], zona["punto"]["lon"]), "timeStandard": "UTC",
                            "fechaDescarga": hoy, "fechaCorte": corte(tmax), "primerDatoValido": primero(tmax)},
        },
        "definiciones": {"umbralDiaSecoMm": UMBRAL_SECO_MM, "rachaMinimaReportadaDias": MIN_RACHA,
                         "umbralCalorC": UMBRAL_CALOR_C, "calorMinimoReportadoDias": MIN_CALOR,
                         "ventanaResumen": {"inicio": VENT[0], "fin": VENT[1]},
                         "tratamientoFaltantes": "null; un día null corta la racha o el episodio y no cuenta"},
        "temporadas": temporadas,
        "resumen": {"aniosCompletos": len(completas),
                    "medianaLluviaVentanaMm": round(statistics.median(t["ventana"]["lluviaMm"] for t in completas), 2),
                    "medianaRachaMasLargaDias": statistics.median(t["ventana"]["rachaMasLarga"]["dias"] for t in completas),
                    "peoresAnios": [{"anio": t["anio"], **t["ventana"]["rachaMasLarga"]} for t in peores]},
    }

if __name__ == "__main__":
    destino = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    raw_dir = Path(__file__).parent / "raw"
    raw_dir.mkdir(exist_ok=True)
    (destino / "clima").mkdir(exist_ok=True)
    for zona in json.loads((destino / "zonas.json").read_text(encoding="utf-8"))["zonas"]:
        raw = json.load(urllib.request.urlopen(url(zona["punto"]["lat"], zona["punto"]["lon"]), timeout=180))
        (raw_dir / f"{zona['id']}.json").write_text(json.dumps(raw), encoding="utf-8")
        salida = destino / "clima" / f"{zona['id']}.json"
        salida.write_text(json.dumps(procesar(zona, raw), ensure_ascii=False, indent=2), encoding="utf-8")
        print("escrito", salida)
