# Rol 2 — Ingeniería de datos

> **Para tu IA:** eres asistente del ingeniero de datos de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Tu trabajo es usar Python en `data-pipeline/` para descargar y procesar lluvia (GPM IMERG) y temperatura máxima (MERRA‑2) de NASA POWER para **cada zona de la Península de Yucatán** y entregar `app/data/clima/<zona>.json` con el formato de `docs/contrato-datos.md` (sección 2). También mantienes los puntos de `app/data/zonas.json` (sección 1). La PWA no depende de un servidor: tu script corre antes del despliegue. El contexto está en `docs/00-contexto-general.md`. No inventes datos.

## Entregable del día

> Un archivo `clima/<zona>.json` por cada zona de `zonas.json`, generado con `data-pipeline/clima.py`, que reproduzca la tabla de referencia en `yuc-noroeste`. Además, el resumen comparativo de la península para el pitch.

**Primera tarea, en los primeros 30 minutos:** corre el script y sube los archivos. Ya funciona: se probó el 2026‑11‑14 con las 7 zonas.

```
cd data-pipeline
python clima.py ../app/data
```

- Lee `app/data/zonas.json`, descarga NASA POWER para cada punto, guarda la respuesta cruda en `data-pipeline/raw/<zona>.json` y escribe `app/data/clima/<zona>.json`.
- No necesita dependencias ni clave de API. Tarda unos segundos por zona.
- Escribe en UTF‑8. En Windows no uses `>` para redirigir, porque guarda en cp1252.

## La API

```
GET https://power.larc.nasa.gov/api/temporal/daily/point
    ?parameters=IMERG_PRECTOT,T2M_MAX
    &community=AG
    &longitude=-89.75
    &latitude=20.49
    &start=19980101
    &end=20251231
    &format=JSON
    &time-standard=UTC
```

- `properties.parameter.<PARAM>` es un objeto `{ "YYYYMMDD": valor }`.
- `parameters.<PARAM>.units` da las unidades (`mm/day` y `C`).
- `header.fill_value` es `-999.0`, el valor para dato faltante.
- `header.api.version` es `v2.10.3`.
- `geometry.coordinates` es `[lon, lat, elevación]`.
- La API acepta `time-standard=LST` (hora local). Usamos `UTC`, como en la tabla de referencia. En Yucatán (UTC‑6) los totales diarios quedan corridos 6 horas; es aceptable para rachas de varios días, pero conviene saberlo si un juez pregunta.

## Qué parámetro y desde cuándo

| Parámetro | Producto | Primer dato válido | Resolución aprox. | Uso |
|---|---|---|---|---|
| `IMERG_PRECTOT` | GPM IMERG (satélite) | **1998‑01‑01** (antes viene `-999`) | 0.1°, unos 10 km | **Rachas secas** |
| `T2M_MAX` | MERRA‑2 (reanálisis) | 1981 | 0.5° × 0.625°, unos 50 km | **Episodios de calor** (dato regional) |
| `PRECTOTCORR` | MERRA‑2, corregida | 1981 | unos 50 km | No se usa: una sola fuente de lluvia |

IMERG y PRECTOTCORR **no siempre coinciden**: en 2025, en el noroeste de Yucatán, IMERG da una racha de 12 días (6–17 de junio) y PRECTOTCORR una de 8 (29 de junio–6 de julio). Por eso se usa solo IMERG para la lluvia.

## Normalización (reglas obligatorias)

1. Convierte `-999.0` (o el valor de `header.fill_value`) a `null`. **Nunca lo cuentes como 0 mm.**
2. Conserva todas las fechas, incluso las que no tienen dato.
3. **Día seco:** lluvia menor que `1.0` mm. **Racha seca:** días secos consecutivos; un día `null` la corta. Se reportan todas las rachas de 3 días o más del año completo.
4. **Día de calor:** `T2M_MAX ≥ 35.0` °C. **Episodio de calor:** días de calor consecutivos; un `null` lo corta. Se reportan todos los episodios de 1 día o más.
5. `temporadas[].completa` es `true` si el año no tiene faltantes ni de lluvia ni de temperatura.
6. **Ventana de resumen:** del `06-01` al `08-31`, solo para `ventana` y `resumen`. Solo las temporadas con la ventana completa entran en la mediana y en los peores años.
7. Redondea a 2 decimales.
8. Si el Rol 3 cambia `umbralDiaSecoMm` o `umbralCalorC`, cambia las constantes al inicio de `clima.py` y regenera todo.

## Resultados de referencia

### `yuc-noroeste` (IMERG, 1 de junio–31 de agosto, umbral de 1 mm)

El script debe reproducir esta tabla. Se verificó el 2026‑11‑14.

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

### Las 7 zonas (resumen verificado)

| Zona | Lluvia anual (mediana) | Lluvia jun–ago (mediana) | Racha más larga jun–ago (mediana) | Días ≥ 35 °C en mayo (mediana) | Peores años |
|---|---:|---:|---:|---:|---|
| `yuc-noroeste` | 1109 mm | 521.8 mm | 7 | 24 | 1998 (18), 2025 (12), 2014 (11) |
| `yuc-oriente` | 1322 mm | 567.35 mm | 8.5 | 21.5 | 1998 (17), 2010 (15), 2001 (12) |
| `yuc-sur` | 1133 mm | 521.7 mm | 7 | 25.5 | 2014 (19), 1998 (17), 2019 (11) |
| `camp-chenes` | 1179 mm | 536.81 mm | 6.5 | 24 | 1998 (19), 2014 (14), 2025 (12) |
| `camp-sur` | 1488 mm | 765.15 mm | 5 | 26 | 2023 (16), 1998 (10), 2014 (9) |
| `qroo-centro` | 1344 mm | 482.48 mm | 10 | 7.5 | 2015 (17), 2018 (17), 2022 (17) |
| `qroo-sur` | 1330 mm | 501.4 mm | 9.5 | 0 | 2019 (23), 1998 (19), 2015 (18) |

**Para el pitch:**
- 2022 y 2025 tuvieron lluvia parecida en el noroeste de Yucatán (488 mm contra 469 mm), pero la racha de 2025 duró más del doble (12 días contra 5).
- Quintana Roo llueve más al año, pero tiene las rachas secas de verano más largas de la península.
- Según MERRA‑2, en agosto casi no hay días de 35 °C o más en ninguna zona. El calor pega en mayo y junio, cuando se establece el cultivo.

## A quién le entregas qué

| Para | Entregas | Lo usa para |
|---|---|---|
| Rol 4 (motor) | `app/data/clima/<zona>.json` con `rachas` y `episodiosCalor` | Cruzar rachas y calor con los días críticos de cada estrategia |
| Rol 3 (reglas) | Las tablas de arriba y, si las pide, las rachas de julio a diciembre | Calibrar etapas, umbrales y la sensibilidad del establecimiento |
| Rol 5 (captura) | `zonas.json` | Asignar la zona más cercana |
| Rol 6 (resultados) | `fuentes`, `resumen` de cada zona y los datos del pitch | Mostrar el dato de NASA con su fecha y la vista de la península |
| Rol 1 (líder) | Confirmación de que las 7 zonas están listas, o cuáles faltan | Decidir si se recorta a 3 zonas |

## Extras, solo si sobra tiempo

- `clima-diario/<zona>.json` con la serie diaria para graficar.
- SMAP L4 (humedad del suelo en la zona de raíces) como contexto de los años secos.
- Tendencia de largo plazo: comparar 1998–2011 contra 2012–2025 en cada zona.

## Criterios de terminado

- [ ] Hay un `app/data/clima/<zona>.json` por cada zona de `zonas.json`, válido según el contrato.
- [ ] `yuc-noroeste` reproduce la tabla de referencia.
- [ ] No hay ningún `-999` en los archivos. Los faltantes son `null`.
- [ ] Las fuentes de lluvia y temperatura están completas (producto, parámetro, resolución, fecha de corte y URL).
- [ ] `data-pipeline/clima.py` se puede volver a ejecutar y `data-pipeline/raw/` guarda las respuestas originales.
