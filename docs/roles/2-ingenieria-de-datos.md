# Rol 2 — Ingeniería de datos

> **Para tu IA:** eres asistente del ingeniero de datos de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Tu trabajo es descargar la lluvia diaria de NASA POWER para el punto de la parcela, normalizarla y entregar `app/data/clima.json` con el formato exacto de `docs/contrato-datos.md` (sección 1). El contexto completo está en `docs/00-contexto-general.md`. No inventes datos. Si algo falta, déjalo en `null` y repórtalo.

## Entregable del día

> Descarga la lluvia diaria de NASA POWER para el municipio, con todos los años disponibles. Entrega un JSON con fuente, coordenadas, unidades, fecha de corte y la racha seca más larga dentro de la ventana del cultivo para cada año, más la mediana y los peores años.

**Primera tarea, en los primeros 30–60 minutos:** comparte el formato de `clima.json` con un ejemplo. El ejemplo ya está en el contrato. Así el Rol 4 programa el motor contra él mientras tú preparas la serie real.

## La API

```
GET https://power.larc.nasa.gov/api/temporal/daily/point
    ?parameters=IMERG_PRECTOT,PRECTOTCORR,T2M_MAX
    &community=AG
    &longitude=-89.75
    &latitude=20.49
    &start=19810101
    &end=20251231
    &format=JSON
    &time-standard=UTC
```

- No requiere clave. Responde en menos de un segundo por punto.
- **Estructura de la respuesta:**
  - `properties.parameter.<PARAM>` es un objeto `{ "YYYYMMDD": valor }`.
  - `parameters.<PARAM>.units` da las unidades (`mm/day` y `C`).
  - `header.fill_value` es `-999.0`, el valor para dato faltante.
  - `header.sources` lista las fuentes (`["MERRA2", "IMERG", "POWER"]`).
  - `header.api.version` es `v2.10.3`.
  - `geometry.coordinates` es `[lon, lat, elevación]`, con elevación de 24.93 m en este punto.
- La API también acepta `time-standard=LST` (hora local). Usa `UTC`, como en la consulta verificada, y anótalo en `fuente.timeStandard`.

## Hallazgo importante: qué parámetro y desde cuándo

Verificado el 2026‑11‑14 en el punto 20.49 N, −89.75 O:

| Parámetro | Producto | Primer dato válido | Resolución aprox. | Uso |
|---|---|---|---|---|
| `IMERG_PRECTOT` | GPM IMERG (satélite) | **1998‑01‑01** (antes de esa fecha viene `-999`) | 0.1°, unos 10 km | **Principal** |
| `PRECTOTCORR` | MERRA‑2, corregida | 1981‑01‑01 | 0.5° × 0.625°, unos 50 km | Respaldo y serie larga |
| `T2M_MAX` | MERRA‑2 | 1981 | unos 50 km | Solo contexto |

La frase «hay datos desde 1981» es cierta para **PRECTOTCORR**, no para IMERG. Las dos fuentes **no siempre coinciden**. En 2025, IMERG da una racha de 12 días (6–17 de junio) y PRECTOTCORR una de 8 días (29 de junio–6 de julio). **Usa una sola fuente en el comparador** y declara cuál es en `fuente`. La recomendación es IMERG.

## Normalización (reglas obligatorias)

1. Convierte `-999.0` (o el valor de `header.fill_value`) a `null`. **Nunca lo cuentes como 0 mm.**
2. Conserva todas las fechas, incluso las que no tienen dato.
3. **Día seco:** lluvia menor que `1.0` mm (`umbralDiaSecoMm`). Es una decisión provisional que el Rol 3 confirma.
4. **Racha seca:** días secos consecutivos.
   - Un día `null` **corta** la racha y no cuenta como seco.
   - Reporta en `temporadas[].rachas` todas las rachas de 3 días o más del año completo.
5. **Ventana de resumen:** del `06-01` al `08-31` hasta que el Rol 3 entregue la ventana del cultivo. Si la cambian, regenera el archivo.
6. **Temporada completa:** `ventana.diasConDato == ventana.diasEsperados`. Solo las temporadas completas entran en la mediana y en los peores años.
7. Redondea la lluvia a 2 decimales.
8. Llena `fuente.fechaDescarga` (el día que corres el script) y `fuente.fechaCorte` (la última fecha con dato válido).

## Resultados de referencia (IMERG, 1 de junio–31 de agosto, umbral de 1 mm)

Usa esta tabla para validar tu script. Tus números deben coincidir.

| Año | Lluvia (mm) | Racha más larga | Inicio | Fin |
|---|---:|---:|---|---|
| 1998 | 461.33 | **18** | 1998‑06‑02 | 1998‑06‑19 |
| 1999 | 612.74 | 9 | 1999‑07‑29 | 1999‑08‑06 |
| 2000 | 527.19 | 5 | 2000‑06‑30 | 2000‑07‑04 |
| 2001 | 543.86 | 8 | 2001‑06‑08 | 2001‑06‑15 |
| 2002 | 389.41 | 10 | 2002‑06‑27 | 2002‑07‑06 |
| 2003 | 608.70 | 6 | 2003‑06‑10 | 2003‑06‑15 |
| 2004 | 519.75 | 7 | 2004‑08‑05 | 2004‑08‑11 |
| 2005 | 630.96 | 6 | 2005‑07‑05 | 2005‑07‑10 |
| 2006 | 546.80 | 5 | 2006‑07‑04 | 2006‑07‑08 |
| 2007 | 591.04 | 3 | 2007‑06‑23 | 2007‑06‑25 |
| 2008 | 472.13 | 9 | 2008‑08‑15 | 2008‑08‑23 |
| 2009 | 443.36 | 7 | 2009‑07‑17 | 2009‑07‑23 |
| 2010 | 553.58 | 7 | 2010‑06‑07 | 2010‑06‑13 |
| 2011 | 513.45 | 5 | 2011‑07‑18 | 2011‑07‑22 |
| 2012 | 498.26 | 6 | 2012‑08‑01 | 2012‑08‑06 |
| 2013 | 570.32 | 9 | 2013‑07‑22 | 2013‑07‑30 |
| 2014 | 481.80 | **11** | 2014‑06‑08 | 2014‑06‑18 |
| 2015 | 493.99 | 7 | 2015‑07‑19 | 2015‑07‑25 |
| 2016 | 523.85 | 5 | 2016‑06‑12 | 2016‑06‑16 |
| 2017 | 650.41 | 5 | 2017‑06‑05 | 2017‑06‑09 |
| 2018 | 431.67 | 9 | 2018‑06‑01 | 2018‑06‑09 |
| 2019 | 543.82 | 8 | 2019‑08‑22 | 2019‑08‑29 |
| 2020 | 835.17 | 5 | 2020‑06‑06 | 2020‑06‑10 |
| 2021 | 502.49 | 7 | 2021‑06‑19 | 2021‑06‑25 |
| 2022 | 488.48 | 5 | 2022‑07‑17 | 2022‑07‑21 |
| 2023 | 445.99 | 10 | 2023‑06‑13 | 2023‑06‑22 |
| 2024 | 622.99 | 7 | 2024‑06‑01 | 2024‑06‑07 |
| 2025 | 468.75 | **12** | 2025‑06‑06 | 2025‑06‑17 |

- **Mediana de la racha más larga:** 7 días (28 temporadas completas).
- **Peores años:** 1998 (18 días), 2025 (12) y 2014 (11).
- **Para el pitch:** 2022 y 2025 tuvieron una lluvia parecida (488 mm frente a 469 mm), pero la racha de 2025 duró más del doble (12 días frente a 5).

## Script de referencia (Python, sin dependencias)

```python
# data-pipeline/clima.py  — uso: python clima.py ../app/data/clima.json
# (escribe el archivo en UTF-8; no uses ">" en Windows, porque guarda en cp1252)
import json, statistics, sys, urllib.request
from datetime import date, timedelta

LAT, LON = 20.49, -89.75
PARAM, UMBRAL, MIN_RACHA = "IMERG_PRECTOT", 1.0, 3
VENT = ("06-01", "08-31")
URL = ("https://power.larc.nasa.gov/api/temporal/daily/point"
       f"?parameters={PARAM}&community=AG&longitude={LON}&latitude={LAT}"
       "&start=19980101&end=20251231&format=JSON&time-standard=UTC")

raw = json.load(urllib.request.urlopen(URL, timeout=120))
fill = raw["header"]["fill_value"]
serie = {date(int(k[:4]), int(k[4:6]), int(k[6:])): (None if v == fill else round(v, 2))
         for k, v in raw["properties"]["parameter"][PARAM].items()}

def rachas(dias):
    out, ini, n = [], None, 0
    for d, v in dias + [(None, None)]:
        if v is not None and v < UMBRAL:
            ini, n = (ini or d), n + 1
        else:
            if n >= MIN_RACHA:
                out.append({"inicio": ini.isoformat(), "fin": (ini + timedelta(n - 1)).isoformat(), "dias": n})
            ini, n = None, 0
    return out

temporadas = []
for anio in sorted({d.year for d in serie}):
    dias = sorted((d, v) for d, v in serie.items() if d.year == anio)
    if all(v is None for _, v in dias):
        continue
    vi, vf = date.fromisoformat(f"{anio}-{VENT[0]}"), date.fromisoformat(f"{anio}-{VENT[1]}")
    vent = [(d, v) for d, v in dias if vi <= d <= vf]
    validos = [v for _, v in vent if v is not None]
    rv = rachas(vent)
    mas_larga = max(rv, key=lambda r: r["dias"], default=None)
    temporadas.append({
        "anio": anio,
        "diasConDato": sum(v is not None for _, v in dias), "diasEsperados": len(dias),
        "ventana": {"diasConDato": len(validos), "diasEsperados": len(vent),
                    "lluviaMm": round(sum(validos), 2), "rachaMasLarga": mas_larga},
        "rachas": rachas(dias),
    })

completas = [t for t in temporadas
             if t["ventana"]["diasConDato"] == t["ventana"]["diasEsperados"] and t["ventana"]["rachaMasLarga"]]
peores = sorted(completas, key=lambda t: -t["ventana"]["rachaMasLarga"]["dias"])[:3]
ultimo = max(d for d, v in serie.items() if v is not None)

salida = sys.argv[1] if len(sys.argv) > 1 else "clima.json"
with open(salida, "w", encoding="utf-8") as f:
  json.dump({
    "version": "0.1", "esEjemplo": False,
    "ubicacion": {"lat": LAT, "lon": LON, "elevacionM": raw["geometry"]["coordinates"][2],
                  "municipio": "por confirmar", "estado": "Yucatán"},
    "fuente": {"nombre": "NASA POWER Daily API", "versionApi": raw["header"]["api"]["version"],
               "producto": "GPM IMERG", "parametro": PARAM,
               "unidades": raw["parameters"][PARAM]["units"], "resolucionAprox": "0.1° (~10 km)",
               "url": URL, "timeStandard": raw["header"]["time_standard"],
               "fechaDescarga": date.today().isoformat(), "fechaCorte": ultimo.isoformat(),
               "primerDatoValido": min(d for d, v in serie.items() if v is not None).isoformat()},
    "definiciones": {"umbralDiaSecoMm": UMBRAL, "rachaMinimaReportadaDias": MIN_RACHA,
                     "ventanaResumen": {"inicio": VENT[0], "fin": VENT[1]},
                     "tratamientoFaltantes": "null; un día null corta la racha y no cuenta como seco"},
    "temporadas": temporadas,
    "resumen": {"aniosCompletos": len(completas),
                "medianaRachaMasLargaDias": statistics.median(t["ventana"]["rachaMasLarga"]["dias"] for t in completas),
                "peoresAnios": [{"anio": t["anio"], **t["ventana"]["rachaMasLarga"]} for t in peores]},
  }, f, ensure_ascii=False, indent=2)
print("escrito", salida)
```

- Guarda también el JSON crudo de NASA en `data-pipeline/raw/` para poder rehacer el cálculo sin conexión.
- Si una racha de la ventana empieza antes del `06-01`, el script solo cuenta los días dentro de la ventana. Así se reproducen los números de la tabla.
- En Windows, algunas máquinas del equipo tienen problemas de certificados HTTPS con ciertos sitios. Con `power.larc.nasa.gov` no hubo problema.

## A quién le entregas qué

| Para | Entregas | Lo usa para |
|---|---|---|
| Rol 4 (motor) | `app/data/clima.json` con `temporadas[].rachas` | Cruzar las rachas con las etapas de cada plan |
| Rol 3 (reglas) | La tabla de rachas por año y sus fechas | Ver si la floración del maíz suele caer en rachas y ajustar la ventana y el umbral |
| Rol 6 (resultados) | `fuente.parametro`, `fuente.fechaCorte`, `fuente.url` y el contraste 2022 vs. 2025 | Mostrar «qué dato de NASA influyó» y su fecha |
| Rol 1 (líder) | La recomendación de IMERG frente a PRECTOTCORR | Decidir la fuente oficial |

## Extras, solo si sobra tiempo

- Generar `clima.json` para varios municipios con las coordenadas de `municipios.json` (Rol 5). Un archivo por municipio, por ejemplo `clima-31052.json` con la clave INEGI.
- `clima-diario.json` con la serie diaria para graficar.
- SMAP L4, humedad del suelo en la zona de raíces, como contexto de los años secos.

## Criterios de terminado

- [ ] `app/data/clima.json` es válido según el contrato y reproduce la tabla de referencia.
- [ ] No hay ningún `-999` en el archivo. Los faltantes son `null`.
- [ ] La fuente, el parámetro, las unidades, la fecha de corte y la URL están completos.
- [ ] El script queda en `data-pipeline/` y se puede volver a ejecutar.
