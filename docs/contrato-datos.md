# Contrato de datos v0.3 — Península de Yucatán

> **Dueño:** Rol 1, líder técnico. Si cambia algo, se sube la versión (`0.4`, `0.5`, …) y se avisa a todo el equipo.
>
> **Convenciones:**
> - Las claves van en español y en `camelCase`. Los identificadores (`id`) van en minúsculas, sin acentos y con guiones: `yuc-noroeste`, `tsekel`, `otro-grano`.
> - Las fechas completas usan `YYYY-MM-DD`. Las fechas de calendario que se repiten cada año usan `MM-DD`.
> - La lluvia va en mm y la temperatura en °C.
> - Un dato faltante es `null`, nunca `-999` ni `0`.
> - Todo dato inventado lleva `"esEjemplo": true`. Todo valor sin fuente va en `porConfirmar`.

> **Arquitectura PENDIENTE (2026‑11‑14).** El equipo va a cambiar la arquitectura. Lo que este documento dice sobre PWA, backend o falta de backend, motor en el teléfono, *service worker*, hosting, almacenamiento local o modo sin conexión es la **propuesta anterior** y **no está decidido**. No lo implementes ni lo des por hecho hasta que el Rol 1 publique la nueva arquitectura. Ver `docs/00-contexto-general.md`, sección «Arquitectura (pendiente)».
>
> Los formatos de **datos** (secciones 1 a 5) no dependen de la arquitectura. La firma de `comparar()` (sección 6) y el algoritmo (sección 8) sí pueden cambiar.

## Cambios en v0.3 (2026‑11‑14): las estrategias de rotación

| Cambio | Por qué |
|---|---|
| **3 estrategias** en lugar de 4: `actual` (maíz → maíz), `cobertura` (canavalia → maíz) y `otro-grano` (frijol caupí → maíz). Se retiran `milpa` y `relevo`. | Es el plan de rotaciones que acordó el equipo. El reto pide comparar al menos 3 estrategias, incluida la actual. |
| Cada plan tiene **dos ciclos en secuencia** (`ciclos[].numero` = 1 y 2), un `tipo` (`continuo` o `rotacion`) y un `objetivo` | En v0.2, los `ciclos` eran cultivos del **mismo año** (intercalados o asociados). Una rotación cambia el cultivo **entre** ciclos. |
| `planes.json` agrega `definiciones` (estrategia, rotación, asociación) | Para que todo el equipo y sus IAs usen las palabras igual |
| `reglas.cultivos` queda con `maiz`, `canavalia` y `caupi`. Se retiran `maiz-precoz`, `frijol`, `calabaza` y `mucuna`. La aptitud por suelo se actualiza. | Son los cultivos de las 3 estrategias |
| Entrada: `planes` = `["actual", "cobertura", "otro-grano"]` | Los ids nuevos |
| **Pendiente del Rol 4:** cómo cuenta el motor dos ciclos en secuencia (sección 8) | La lógica del motor la define el Rol 4, no los datos |

### Vocabulario (obligatorio en textos, código e IAs)

| Término | Significado | Ejemplo |
|---|---|---|
| **Estrategia de rotación** (plan) | Qué sembrar, en qué orden y para qué objetivo, durante varios ciclos en la misma parcela | Canavalia en el primer ciclo, maíz en el segundo |
| **Cultivo continuo** | Repetir el mismo cultivo en todos los ciclos. Es la referencia. | Maíz → maíz (`actual`) |
| **Rotación** | Cambiar el cultivo entre ciclos en la misma parcela | Caupí → maíz |
| **Asociación** | Sembrar dos o más cultivos **juntos en el mismo ciclo**. **No es rotación.** | Maíz y frijol juntos (milpa) |
| **Ciclo** | Cada temporada de siembra del plan, numerada 1 y 2. No es un año histórico de la NASA. | Ciclo 1 = canavalia |

## Cambios respecto a v0.1 (historial de v0.2)

> Las filas que hablan de `milpa`, `relevo` y «4 estrategias» quedaron **reemplazadas por v0.3**.

| Cambio | Por qué |
|---|---|
| Enfoque de **península**: `zonas.json` y un archivo de clima por zona (`clima/<zonaId>.json`) | El reto pide adaptarse a condiciones locales, y la península no es homogénea: la exposición a sequía va de 5 % a 28 % según la zona |
| `clima` agrega **temperatura máxima** (`episodiosCalor`), `temporadas[].completa` y `fuentes.lluvia` / `fuentes.temperatura` en lugar de `fuente` | El reto menciona estrés por calor; `T2M_MAX` sale en la misma consulta de NASA POWER |
| **4 estrategias** (mínimo 3, siempre con `actual`): `actual`, `cobertura`, `milpa`, `relevo` | El reto sugiere comparar al menos tres estrategias, incluida la actual |
| Planes con `atributos`, `beneficios` y `riesgos` | El reto pide explicar, para cada estrategia, por qué, evidencia, beneficios, vacíos de información y riesgos |
| `reglas.suelos`: los tipos de suelo maya ajustan el umbral de racha y la aptitud de cada cultivo | El reto pide usar información local del suelo; en v0.1 el suelo no influía en nada |
| **5 criterios** y **4 prioridades** | El reto menciona uso de agua, nitrógeno, materia orgánica, forraje y mercado |
| La sequía y el calor se miden como **proporción de días críticos expuestos**, ya no como "año afectado sí/no" | La versión binaria se saturaba: 25 a 28 de 28 años salían afectados en casi todas las zonas y no distinguía estrategias |
| La salida trae `ranking`, `mejores` por criterio y `recomendados` (puede haber empate) | Con 4 planes ya no hay un solo par que comparar |
| **Se retira el pronóstico de 7 días** del MVP | El reto no lo pide y era la parte más riesgosa |

## Archivos que define este contrato

| Archivo | Lo produce | Lo consume |
|---|---|---|
| `app/data/zonas.json` | Rol 2 (puntos) y Rol 3 (suelos predominantes) | Rol 5 (asignar zona), Rol 4 (cargar el clima de la zona), Rol 6 (nombre de zona, mapa) |
| `app/data/clima/<zonaId>.json` | Rol 2 (`data-pipeline/clima.py`) | Rol 4 (motor) y Rol 6 (fuentes y fechas) |
| `app/data/planes.json` | Rol 3 | Rol 4 y Rol 6 |
| `app/data/reglas.json` | Rol 3 | Rol 4; Rol 5 (lista de suelos y prioridades) |
| `app/data/municipios.json` | Rol 5 | Rol 5 |
| `app/data/parcela-ejemplo.json` | Roles 1 y 5 | Rol 5 |
| Entrada de `comparar()` | Rol 5 | Rol 4 |
| Salida de `comparar()` | Rol 4 | Rol 6 |

---

## 1. `zonas.json` (Roles 2 y 3)

La península se divide en **zonas agroclimáticas**, cada una con un punto representativo para descargar el clima. Las coordenadas son las cabeceras municipales de referencia. Los suelos predominantes son una propuesta que el Rol 3 confirma con INEGI.

```json
{
  "version": "0.2",
  "nota": "Punto representativo por zona. El clima describe la región, no una parcela.",
  "zonas": [
    { "id": "yuc-noroeste", "nombre": "Noroeste de Yucatán", "estado": "Yucatán",
      "punto": { "lat": 20.49, "lon": -89.75 }, "archivoClima": "clima/yuc-noroeste.json",
      "suelosPredominantes": ["tsekel"], "porConfirmar": ["suelos predominantes (INEGI 1:250 000)"] },
    { "id": "yuc-oriente", "nombre": "Oriente de Yucatán (Valladolid–Tizimín)", "estado": "Yucatán",
      "punto": { "lat": 20.69, "lon": -88.20 }, "archivoClima": "clima/yuc-oriente.json",
      "suelosPredominantes": ["tsekel", "kankab"], "porConfirmar": ["suelos predominantes (INEGI 1:250 000)"] },
    { "id": "yuc-sur", "nombre": "Sur de Yucatán y Puuc (Oxkutzcab–Tekax)", "estado": "Yucatán",
      "punto": { "lat": 20.30, "lon": -89.42 }, "archivoClima": "clima/yuc-sur.json",
      "suelosPredominantes": ["kankab", "tsekel"], "porConfirmar": ["suelos predominantes (INEGI 1:250 000)"] },
    { "id": "camp-chenes", "nombre": "Los Chenes, Campeche (Hopelchén)", "estado": "Campeche",
      "punto": { "lat": 19.75, "lon": -89.84 }, "archivoClima": "clima/camp-chenes.json",
      "suelosPredominantes": ["kankab", "akalche"], "porConfirmar": ["suelos predominantes (INEGI 1:250 000)"] },
    { "id": "camp-sur", "nombre": "Sur de Campeche (Escárcega–Candelaria)", "estado": "Campeche",
      "punto": { "lat": 18.61, "lon": -90.74 }, "archivoClima": "clima/camp-sur.json",
      "suelosPredominantes": ["akalche", "kankab"], "porConfirmar": ["suelos predominantes (INEGI 1:250 000)"] },
    { "id": "qroo-centro", "nombre": "Zona maya de Quintana Roo (Felipe Carrillo Puerto)", "estado": "Quintana Roo",
      "punto": { "lat": 19.58, "lon": -88.05 }, "archivoClima": "clima/qroo-centro.json",
      "suelosPredominantes": ["tsekel", "kankab"], "porConfirmar": ["suelos predominantes (INEGI 1:250 000)"] },
    { "id": "qroo-sur", "nombre": "Sur de Quintana Roo (Bacalar)", "estado": "Quintana Roo",
      "punto": { "lat": 18.68, "lon": -88.39 }, "archivoClima": "clima/qroo-sur.json",
      "suelosPredominantes": ["akalche", "kankab"], "porConfirmar": ["suelos predominantes (INEGI 1:250 000)"] }
  ]
}
```

- `suelosPredominantes` solo **sugiere** opciones en la captura; el tipo de suelo de la parcela lo elige el productor.
- MVP mínimo: **una zona por estado** (`yuc-noroeste`, `camp-chenes`, `qroo-centro`). Meta: las 7.

## 2. `clima/<zonaId>.json` (Rol 2)

Un archivo por zona, generado por `data-pipeline/clima.py`. Fragmento real de `yuc-noroeste` (descargado el 2026‑11‑14):

```json
{
  "version": "0.2",
  "esEjemplo": false,
  "zona": { "id": "yuc-noroeste", "nombre": "Noroeste de Yucatán", "estado": "Yucatán" },
  "ubicacion": { "lat": 20.49, "lon": -89.75, "elevacionM": 24.93 },
  "fuentes": {
    "lluvia": {
      "nombre": "NASA POWER Daily API", "versionApi": "v2.10.3",
      "producto": "GPM IMERG", "parametro": "IMERG_PRECTOT", "unidades": "mm/day",
      "resolucionAprox": "0.1° (~10 km)",
      "url": "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=IMERG_PRECTOT,T2M_MAX&community=AG&longitude=-89.75&latitude=20.49&start=19980101&end=20251231&format=JSON&time-standard=UTC",
      "timeStandard": "UTC", "fechaDescarga": "2026-11-14", "fechaCorte": "2025-12-31", "primerDatoValido": "1998-01-01"
    },
    "temperatura": {
      "nombre": "NASA POWER Daily API", "versionApi": "v2.10.3",
      "producto": "MERRA-2", "parametro": "T2M_MAX", "unidades": "C",
      "resolucionAprox": "0.5° x 0.625° (~50 km)",
      "url": "(la misma consulta)",
      "timeStandard": "UTC", "fechaDescarga": "2026-11-14", "fechaCorte": "2025-12-31", "primerDatoValido": "1998-01-01"
    }
  },
  "definiciones": {
    "umbralDiaSecoMm": 1.0,
    "rachaMinimaReportadaDias": 3,
    "umbralCalorC": 35.0,
    "calorMinimoReportadoDias": 1,
    "ventanaResumen": { "inicio": "06-01", "fin": "08-31" },
    "tratamientoFaltantes": "null; un día null corta la racha o el episodio y no cuenta"
  },
  "temporadas": [
    {
      "anio": 2025,
      "completa": true,
      "diasConDato": 365,
      "diasEsperados": 365,
      "ventana": {
        "diasConDato": 92, "diasEsperados": 92, "lluviaMm": 468.75,
        "rachaMasLarga": { "inicio": "2025-06-06", "fin": "2025-06-17", "dias": 12 }
      },
      "rachas": [
        { "inicio": "2025-05-24", "fin": "2025-05-30", "dias": 7 },
        { "inicio": "2025-06-06", "fin": "2025-06-17", "dias": 12 }
      ],
      "episodiosCalor": [
        { "inicio": "2025-05-13", "fin": "2025-06-04", "dias": 23 },
        { "inicio": "2025-06-06", "fin": "2025-06-17", "dias": 12 }
      ]
    }
  ],
  "resumen": {
    "aniosCompletos": 28,
    "medianaLluviaVentanaMm": 521.8,
    "medianaRachaMasLargaDias": 7,
    "peoresAnios": [
      { "anio": 1998, "inicio": "1998-06-02", "fin": "1998-06-19", "dias": 18 },
      { "anio": 2025, "inicio": "2025-06-06", "fin": "2025-06-17", "dias": 12 },
      { "anio": 2014, "inicio": "2014-06-08", "fin": "2014-06-18", "dias": 11 }
    ]
  }
}
```

- `temporadas[].rachas` contiene **todas** las rachas secas de 3 días o más del año completo, y `episodiosCalor` todos los tramos de días con `T2M_MAX ≥ umbralCalorC`. Aquí se recortaron para el ejemplo.
- `completa` es `true` si el año no tiene días faltantes ni de lluvia ni de temperatura. El motor solo usa temporadas completas.
- Si una racha o un episodio cruza el 31 de diciembre, se corta en esa fecha.
- La `ventanaResumen` solo sirve para el resumen y el pitch; el motor usa el año completo.
- Si el Rol 3 cambia `umbralDiaSecoMm` o `umbralCalorC`, el Rol 2 regenera los archivos.

## 3. `planes.json` (Rol 3)

Las **3 estrategias** que acordó el equipo. Cada fila es un plan completo de dos ciclos en la misma parcela:

| Plan (`id`) | Tipo | Primer ciclo | Segundo ciclo | Objetivo | Cosechas de maíz |
|---|---|---|---|---|---|
| **Actual** (`actual`) | Cultivo continuo (referencia) | Maíz de temporal | Maíz de temporal | Cosechar maíz en ambos ciclos | 2 |
| **Rotación con cobertura** (`cobertura`) | Rotación | Canavalia (cobertura, sin cosecha) | Maíz de temporal | Dedicar un ciclo a cubrir el suelo antes de volver al maíz | 1 |
| **Rotación con otro grano** (`otro-grano`) | Rotación | Frijol caupí | Maíz de temporal | Cosechar un grano distinto en el primer ciclo | 1 (más 1 de caupí) |

```json
{
  "version": "0.3",
  "definiciones": {
    "estrategia": "Plan de qué sembrar, en qué orden y para qué objetivo, durante varios ciclos en la misma parcela.",
    "cultivoContinuo": "Repetir el mismo cultivo en todos los ciclos; sirve como referencia.",
    "rotacion": "Cambiar el cultivo entre ciclos en la misma parcela.",
    "asociacion": "Sembrar dos o más cultivos juntos en el mismo ciclo; no es rotación."
  },
  "planes": [
    {
      "id": "actual",
      "nombre": "Actual: maíz continuo",
      "tipo": "continuo",
      "objetivo": "Cosechar maíz en ambos ciclos.",
      "esEjemplo": true,
      "descripcionCorta": "Maíz de temporal en los dos ciclos. Es la práctica de referencia.",
      "ciclos": [
        { "numero": 1, "cultivo": "maiz", "siembra": "06-15", "cosecha": "10-31", "proposito": "grano" },
        { "numero": 2, "cultivo": "maiz", "siembra": "06-15", "cosecha": "10-31", "proposito": "grano" }
      ],
      "atributos": { "fijacionNitrogeno": "bajo", "ingresoForraje": "alto" },
      "beneficios": ["Práctica conocida; no requiere semilla nueva ni otra mano de obra", "Cosecha de maíz en los dos ciclos", "El rastrojo puede servir de forraje"],
      "riesgos": ["Repetir maíz no corta el ciclo de plagas y enfermedades del maíz", "Suelo descubierto en secas: pierde humedad y materia orgánica", "No aporta nitrógeno al suelo"],
      "fuentes": ["pendiente: calendario agrícola SIAP/INIFAP para la península"],
      "porConfirmar": ["fecha real de siembra del productor", "nivel de ingreso relativo (precios locales)"]
    },
    {
      "id": "cobertura",
      "nombre": "Rotación con cobertura",
      "tipo": "rotacion",
      "objetivo": "Dedicar un ciclo a cubrir el suelo antes de volver al maíz.",
      "esEjemplo": true,
      "descripcionCorta": "Primer ciclo con canavalia para cubrir el suelo; en el segundo ciclo se vuelve al maíz.",
      "ciclos": [
        { "numero": 1, "cultivo": "canavalia", "siembra": "06-15", "cosecha": "04-30", "proposito": "cobertura" },
        { "numero": 2, "cultivo": "maiz",      "siembra": "06-15", "cosecha": "10-31", "proposito": "grano" }
      ],
      "atributos": { "fijacionNitrogeno": "alto", "ingresoForraje": "bajo" },
      "beneficios": ["Cubre el suelo y le aporta materia orgánica", "La canavalia fija nitrógeno para el maíz del segundo ciclo", "Corta el ciclo de plagas del maíz por un ciclo"],
      "riesgos": ["En el primer ciclo no hay cosecha de maíz", "Hay que conseguir semilla de canavalia", "La canavalia no da cosecha para comer o vender (por confirmar su uso como forraje)"],
      "fuentes": ["Ensayo de leguminosas de cobertura (mucuna y canavalia) con maíz en el sur de Yucatán: https://www.scielo.org.mx/scielo.php?pid=S0187-57792009000100008&script=sci_arttext"],
      "porConfirmar": ["fecha de siembra y de corte o incorporación de la canavalia", "disponibilidad de semilla de canavalia"]
    },
    {
      "id": "otro-grano",
      "nombre": "Rotación con otro grano",
      "tipo": "rotacion",
      "objetivo": "Cosechar un grano distinto en el primer ciclo.",
      "esEjemplo": true,
      "descripcionCorta": "Primer ciclo con frijol caupí (x'pelón) para cosechar grano; en el segundo ciclo se vuelve al maíz.",
      "ciclos": [
        { "numero": 1, "cultivo": "caupi", "siembra": "06-15", "cosecha": "09-15", "proposito": "grano" },
        { "numero": 2, "cultivo": "maiz",  "siembra": "06-15", "cosecha": "10-31", "proposito": "grano" }
      ],
      "atributos": { "fijacionNitrogeno": "medio", "ingresoForraje": "alto" },
      "beneficios": ["Dos cosechas de grano distintas: diversifica la alimentación y el ingreso", "El caupí fija nitrógeno", "Corta el ciclo de plagas del maíz por un ciclo"],
      "riesgos": ["Solo una cosecha de maíz en los dos ciclos", "La floración del caupí puede caer en la sequía de medio verano", "El caupí tolera mal el encharcamiento (suelo ak'alche)"],
      "fuentes": ["pendiente: INIFAP (variedades de caupí o x'pelón para la península)"],
      "porConfirmar": ["fechas de siembra y cosecha del caupí", "variedad local de caupí", "mercado local del caupí"]
    }
  ]
}
```

- **`ciclos[].numero`** es el orden dentro del plan (1 y 2). **No** es un año histórico de la NASA. El año histórico que se use como escenario es otra cosa y no se guarda en el plan.
- **`tipo`** vale `"continuo"` (repite el cultivo) o `"rotacion"` (cambia el cultivo entre ciclos). Si se siembran dos cultivos juntos en el mismo ciclo, eso es **asociación**. Ninguna de las 3 estrategias la usa.
- **`siembra` y `cosecha`** usan `MM-DD`. Si `cosecha` es anterior a `siembra`, el ciclo continúa al año siguiente. En un ciclo de `proposito: "cobertura"` no hay cosecha: `cosecha` es la fecha en que se corta o incorpora la cobertura.
- **Todas las fechas son de ejemplo** (`esEjemplo: true`). Las confirma el Rol 3.
- `cultivo` debe existir como clave en `reglas.json → cultivos`.
- `atributos` usa los niveles `"bajo"`, `"medio"` o `"alto"`, **relativos entre los 3 planes**. Cada nivel necesita una fuente en `fuentes` o una entrada en `porConfirmar`.
- `beneficios` y `riesgos` son frases cortas en lenguaje de productor. El motor agrega riesgos calculados (ver sección 8).
- **Cosechas de maíz por plan:** se deducen de los ciclos con `cultivo: "maiz"` y `proposito: "grano"` (actual 2, cobertura 1, otro-grano 1). La interfaz debe dejar claro que el plan `cobertura` no tiene cosecha en el ciclo 1.

## 4. `reglas.json` (Rol 3)

```json
{
  "version": "0.3",
  "esEjemplo": true,
  "umbralDiaSecoMm": 1.0,
  "rachaRelevanteDias": 5,
  "umbralCalorC": 35.0,
  "episodioCalorRelevanteDias": 3,
  "cultivos": {
    "maiz": {
      "nombre": "Maíz",
      "etapas": [
        { "id": "establecimiento", "nombre": "Germinación y establecimiento", "desdeDia": 0,  "hastaDia": 20,  "sensibilidad": "alta" },
        { "id": "floracion",       "nombre": "Floración (espiga y jilote)",   "desdeDia": 55, "hastaDia": 75,  "sensibilidad": "alta" },
        { "id": "llenado",         "nombre": "Llenado de grano",              "desdeDia": 76, "hastaDia": 100, "sensibilidad": "media" }
      ],
      "fuentes": ["pendiente: FAO-56 / INIFAP"],
      "porConfirmar": ["sensibilidad alta del establecimiento: una racha seca tras la siembra obliga a resembrar"]
    },
    "canavalia": {
      "nombre": "Canavalia (cobertura)",
      "etapas": [
        { "id": "establecimiento", "nombre": "Establecimiento", "desdeDia": 0, "hastaDia": 20, "sensibilidad": "media" }
      ],
      "fuentes": ["pendiente: ensayo de leguminosas de cobertura en el sur de Yucatán (SciELO)"],
      "porConfirmar": ["etapas de la canavalia; como no se cosecha, no tiene etapas de sensibilidad alta"]
    },
    "caupi": {
      "nombre": "Frijol caupí (x'pelón)",
      "etapas": [
        { "id": "establecimiento", "nombre": "Establecimiento",  "desdeDia": 0,  "hastaDia": 15, "sensibilidad": "media" },
        { "id": "floracion",       "nombre": "Floración",        "desdeDia": 35, "hastaDia": 50, "sensibilidad": "alta" },
        { "id": "llenado",         "nombre": "Llenado de vaina", "desdeDia": 51, "hastaDia": 75, "sensibilidad": "media" }
      ],
      "fuentes": ["pendiente: FAO-56 / INIFAP"],
      "porConfirmar": ["días a floración y a cosecha del caupí local"]
    }
  },
  "suelos": {
    "tsekel": {
      "nombre": "Tsek'el (pedregoso y poco profundo)",
      "equivalenteWRB": "Leptosol",
      "ajusteRachaDias": -1,
      "aptitud": { "maiz": "media", "canavalia": "media", "caupi": "media" },
      "nota": "Retiene poca agua: el cultivo se estresa con menos días secos."
    },
    "kankab": {
      "nombre": "K'ankab (rojo y más profundo)",
      "equivalenteWRB": "Luvisol",
      "ajusteRachaDias": 0,
      "aptitud": { "maiz": "alta", "canavalia": "alta", "caupi": "alta" },
      "nota": "Mejor retención de agua."
    },
    "akalche": {
      "nombre": "Ak'alche (bajo que se inunda)",
      "equivalenteWRB": "Gleysol / Vertisol",
      "ajusteRachaDias": 1,
      "aptitud": { "maiz": "baja", "canavalia": "media", "caupi": "baja" },
      "nota": "Se encharca en lluvias intensas y se agrieta en secas."
    },
    "fuentes": ["sugeridas: INEGI edafología 1:250 000; Bautista y Zinck (2010), clasificación maya de suelos; FAO GAEZ"],
    "porConfirmar": ["todos los ajustes y aptitudes son propuestas del equipo"]
  },
  "cobertura": {
    "diasMinimosPorMes": 15,
    "nota": "Un mes cuenta como cubierto si algún ciclo está en pie al menos 15 días de ese mes."
  },
  "niveles": { "bajo": 0, "medio": 0.5, "alto": 1 },
  "prioridades": {
    "agua":      { "nombre": "Cuidar el agua (resistir la sequía)" },
    "suelo":     { "nombre": "Cuidar el suelo (cubrirlo y darle materia orgánica)" },
    "nitrogeno": { "nombre": "Aportar nitrógeno (gastar menos en fertilizante)" },
    "ingreso":   { "nombre": "Tener más ingreso o forraje" }
  },
  "pesosPorPrioridad": {
    "agua":      { "rachasSecas": 0.45, "estresCalor": 0.20, "coberturaSuelo": 0.15, "fijacionNitrogeno": 0.10, "ingresoForraje": 0.10 },
    "suelo":     { "rachasSecas": 0.15, "estresCalor": 0.10, "coberturaSuelo": 0.45, "fijacionNitrogeno": 0.20, "ingresoForraje": 0.10 },
    "nitrogeno": { "rachasSecas": 0.15, "estresCalor": 0.10, "coberturaSuelo": 0.20, "fijacionNitrogeno": 0.45, "ingresoForraje": 0.10 },
    "ingreso":   { "rachasSecas": 0.15, "estresCalor": 0.10, "coberturaSuelo": 0.10, "fijacionNitrogeno": 0.15, "ingresoForraje": 0.50 }
  },
  "toleranciaEmpate": {
    "rachasSecas": 0.05,
    "estresCalor": 0.05,
    "coberturaSuelo": 0.09,
    "fijacionNitrogeno": 0,
    "ingresoForraje": 0,
    "total": 0.02
  }
}
```

- `desdeDia` y `hastaDia` cuentan los días desde la siembra del ciclo.
- **Días críticos** son los días de etapas con `sensibilidad: "alta"`.
- Umbral efectivo de racha = `rachaRelevanteDias + suelos[tipo].ajusteRachaDias`. Si el tipo de suelo es `null`, se usa `rachaRelevanteDias`.
- Cada fila de `pesosPorPrioridad` suma 1.
- Todas las tolerancias están en unidades de puntaje (0 a 1). En cobertura, 0.09 equivale a un mes.

## 5. `municipios.json` (Rol 5)

```json
[
  { "clave": "31xxx", "nombre": "…", "estado": "Yucatán", "lat": 0, "lon": 0 }
]
```

- Fuente: catálogo AGEEML de INEGI, con coordenadas de la cabecera municipal. Incluye municipios de Yucatán, Campeche y Quintana Roo.
- La zona **no** se guarda aquí: la captura la asigna en el teléfono por cercanía (sección 6).

## 6. Entrada de `comparar()` (Rol 5 → Rol 4)

```json
{
  "version": "0.3",
  "parcela": {
    "id": "ejemplo-01",
    "esEjemplo": true,
    "nombre": "Parcela de ejemplo",
    "ubicacion": {
      "lat": 20.49,
      "lon": -89.75,
      "municipio": "por confirmar",
      "estado": "Yucatán",
      "origen": "lista",
      "zonaId": "yuc-noroeste",
      "distanciaZonaKm": 0
    },
    "modalidad": "temporal",
    "cultivoActual": "maiz",
    "cicloAnterior": { "cultivo": null, "fechaSiembra": null },
    "suelo": { "tipoLocal": "tsekel", "profundidad": null, "pedregosidad": null }
  },
  "prioridad": "agua",
  "planes": ["actual", "cobertura", "otro-grano"]
}
```

- `origen` es `"gps"` o `"lista"`. `prioridad` es una clave de `reglas.prioridades`.
- `zonaId` es la zona cuyo punto está más cerca (Haversine) y `distanciaZonaKm` es la distancia a ese punto, redondeada a 1 decimal.
- `suelo.tipoLocal` es una clave de `reglas.suelos` o `null` ("no sé").
- `planes` son los 3 ids de `planes.json`: `"actual"`, `"cobertura"` y `"otro-grano"`. Siempre incluye `"actual"` (el reto pide al menos 3 estrategias, incluida la actual).
- Si un campo de la parcela es `null`, el motor lo agrega a `datosPendientes`. No lo inventa.

**Firma** *(propuesta anterior; pendiente de la nueva arquitectura)*:

```js
// Función pura y síncrona. No hace fetch dentro de la función.
// `clima` es el archivo de la zona de entrada.parcela.ubicacion.zonaId.
comparar(entrada, { clima, planes, reglas }) -> salida
```

## 7. Salida de `comparar()` (Rol 4 → Rol 6)

Ejemplo para la parcela de la sección 6.

> **Aviso v0.3:** los números de `rachasSecas`, `estresCalor` y `coberturaSuelo` de `actual` vienen del cálculo exploratorio de v0.2, que tomaba **un** ciclo de maíz por año. Con los planes de dos ciclos, el **Rol 4** debe definir cómo se cuentan (sección 8, pendientes) y **recalcularlos**. Por eso `puntajeTotal`, `posicion`, `ranking`, `recomendados` y los `mejores` de rachas y calor aparecen como `null` o vacíos. En la salida real son números e ids. Lo que **no** depende del motor ya está actualizado: ids, ciclos, atributos, beneficios y riesgos.

```json
{
  "version": "0.3",
  "generado": "2026-11-14T15:00:00Z",
  "prioridad": "agua",
  "pesosAplicados": { "rachasSecas": 0.45, "estresCalor": 0.20, "coberturaSuelo": 0.15, "fijacionNitrogeno": 0.10, "ingresoForraje": 0.10 },
  "zona": { "id": "yuc-noroeste", "nombre": "Noroeste de Yucatán", "estado": "Yucatán", "distanciaKm": 0 },
  "suelo": { "tipo": "tsekel", "nombre": "Tsek'el (pedregoso y poco profundo)", "umbralRachaDias": 4 },
  "planes": [
    {
      "id": "actual",
      "nombre": "Actual: maíz continuo",
      "tipo": "continuo",
      "objetivo": "Cosechar maíz en ambos ciclos.",
      "descripcionCorta": "Maíz de temporal en los dos ciclos. Es la práctica de referencia.",
      "calendario": [
        {
          "ciclo": 1, "cultivo": "maiz", "nombreCultivo": "Maíz", "proposito": "grano", "siembra": "06-15", "cosecha": "10-31",
          "etapasCriticas": [
            { "id": "establecimiento", "nombre": "Germinación y establecimiento", "inicio": "06-15", "fin": "07-05" },
            { "id": "floracion", "nombre": "Floración (espiga y jilote)", "inicio": "08-09", "fin": "08-29" }
          ]
        },
        {
          "ciclo": 2, "cultivo": "maiz", "nombreCultivo": "Maíz", "proposito": "grano", "siembra": "06-15", "cosecha": "10-31",
          "etapasCriticas": [
            { "id": "establecimiento", "nombre": "Germinación y establecimiento", "inicio": "06-15", "fin": "07-05" },
            { "id": "floracion", "nombre": "Floración (espiga y jilote)", "inicio": "08-09", "fin": "08-29" }
          ]
        }
      ],
      "cosechasMaiz": 2,
      "criterios": {
        "rachasSecas": {
          "valor": 0.15, "unidad": "proporción de días críticos dentro de una racha seca",
          "diasCriticos": 42, "aniosAfectados": 25, "aniosAnalizados": 28,
          "puntaje": 0.85,
          "explicacion": "En promedio, 6 de los 42 días críticos del maíz cayeron dentro de una racha seca de 4 días o más. Pasó en 25 de 28 años.",
          "evidencia": [
            { "anio": 2025, "cultivo": "maiz", "etapa": "establecimiento", "inicio": "2025-06-06", "fin": "2025-06-17", "dias": 12, "diasTraslape": 3 }
          ]
        },
        "estresCalor": {
          "valor": 0.10, "unidad": "proporción de días críticos dentro de un episodio de calor",
          "diasCriticos": 42, "aniosAfectados": 17, "aniosAnalizados": 28,
          "puntaje": 0.90,
          "explicacion": "En promedio, 4 de los 42 días críticos tuvieron 3 días seguidos o más de 35 °C o más, sobre todo al establecerse en junio.",
          "evidencia": []
        },
        "coberturaSuelo": {
          "mesesDescubierto": 7,
          "mesesCubiertos": ["06", "07", "08", "09", "10"],
          "puntaje": 0.42,
          "explicacion": "El suelo queda descubierto de noviembre a mayo."
        },
        "fijacionNitrogeno": { "nivel": "bajo", "puntaje": 0, "explicacion": "Ningún cultivo del plan fija nitrógeno." },
        "ingresoForraje": { "nivel": "alto", "puntaje": 1, "explicacion": "Dos cosechas de maíz (una por ciclo) y rastrojo para forraje." }
      },
      "puntajeTotal": null,
      "posicion": null,
      "porQue": "(lo genera el motor; pendiente de recalcular con los planes de dos ciclos)",
      "beneficios": ["Práctica conocida; no requiere semilla nueva ni otra mano de obra", "Cosecha de maíz en los dos ciclos", "El rastrojo puede servir de forraje"],
      "riesgos": ["Repetir maíz no corta el ciclo de plagas y enfermedades del maíz", "Suelo descubierto en secas: pierde humedad y materia orgánica", "No aporta nitrógeno al suelo"],
      "datosNasa": [
        { "parametro": "IMERG_PRECTOT", "descripcion": "Lluvia diaria GPM IMERG vía NASA POWER, 1998–2025", "fechaCorte": "2025-12-31" },
        { "parametro": "T2M_MAX", "descripcion": "Temperatura máxima diaria MERRA-2 vía NASA POWER, 1998–2025", "fechaCorte": "2025-12-31" }
      ],
      "faltaConfirmar": ["fecha real de siembra del productor"]
    }
  ],
  "ranking": [
    { "id": "actual",     "puntajeTotal": null, "posicion": null },
    { "id": "cobertura",  "puntajeTotal": null, "posicion": null },
    { "id": "otro-grano", "puntajeTotal": null, "posicion": null }
  ],
  "comparacion": {
    "porCriterio": {
      "rachasSecas":       { "mejores": [], "sinDiferencia": false },
      "estresCalor":       { "mejores": [], "sinDiferencia": false },
      "coberturaSuelo":    { "mejores": ["cobertura"], "sinDiferencia": false },
      "fijacionNitrogeno": { "mejores": ["cobertura"], "sinDiferencia": false },
      "ingresoForraje":    { "mejores": ["actual", "otro-grano"], "sinDiferencia": false }
    },
    "recomendados": [],
    "mensaje": "(lo genera el motor; pendiente de recalcular)"
  },
  "fuentes": {
    "lluvia":      { "nombre": "NASA POWER / GPM IMERG", "url": "https://power.larc.nasa.gov/", "fechaCorte": "2025-12-31", "fechaDescarga": "2026-11-14" },
    "temperatura": { "nombre": "NASA POWER / MERRA-2",   "url": "https://power.larc.nasa.gov/", "fechaCorte": "2025-12-31", "fechaDescarga": "2026-11-14" }
  },
  "temporadasAnalizadas": { "desde": 1998, "hasta": 2025 },
  "datosPendientes": ["Cultivo del ciclo anterior", "Profundidad del suelo", "Pedregosidad"],
  "avisos": [
    "Comparación de exposición histórica; no es un pronóstico de cosecha.",
    "Usamos el clima de la zona Noroeste de Yucatán; describe la región, no tu parcela.",
    "Esta herramienta apoya tu decisión; no reemplaza tu experiencia ni la de un técnico agrícola."
  ]
}
```

> En el ejemplo solo aparece el detalle de `actual`. La salida real incluye los 3 planes con la misma estructura.
>
> Los `mejores` de cobertura, nitrógeno e ingreso se deducen directo de los datos: la canavalia cubre el suelo casi todo el año, solo `cobertura` tiene nitrógeno `alto`, y `actual` y `otro-grano` tienen ingreso `alto`. Aun así, el motor los calcula.
>
> El campo `calendario[].ciclo` y `cosechasMaiz` son nuevos en v0.3, para que la interfaz muestre los dos ciclos y cuántas cosechas de maíz da cada plan.

**Valores posibles:**
- `comparacion.porCriterio.<criterio>.mejores`: ids de los planes empatados en el mejor puntaje. Si todos empatan, `sinDiferencia: true`.
- `comparacion.recomendados`: uno o más ids. Más de uno significa empate técnico.

## 8. Algoritmo de referencia del motor

> **Pendiente del Rol 4 (con el Rol 1), desde v0.3.** Este algoritmo se escribió para v0.2, donde todos los `ciclos` de un plan ocurrían en el **mismo año**. En v0.3 cada plan tiene **dos ciclos en secuencia** (ciclo 1 y luego ciclo 2). El Rol 4 debe decidir y documentar:
>
> 1. **Qué temporada histórica usa cada ciclo.** Opción A: la misma temporada para los dos ciclos, para comparar ciclo por ciclo bajo las mismas lluvias. Opción B: años consecutivos (Y para el ciclo 1, Y+1 para el ciclo 2). Si se hace como en el paso 2 actual (siembra = `Y-MM-DD` para cada ciclo), en la práctica es la opción A.
> 2. **Cómo se mide la cobertura en dos ciclos.** El paso 5 usa un año de referencia. Con dos ciclos en secuencia, los meses de ambos ciclos se encimarían en ese año. Habría que medir sobre los dos ciclos (unos 24 meses) o por ciclo.
> 3. **Cómo mostrar que la canavalia no tiene días críticos.** No tiene etapas de sensibilidad alta porque no se cosecha. Su ciclo no suma días críticos, y el riesgo de sequía del plan `cobertura` viene solo del maíz del ciclo 2.
> 4. **Cómo reflejar en la explicación que `cobertura` no tiene cosecha de maíz en el ciclo 1** (ver `cosechasMaiz`).
>
> Los pasos de abajo siguen siendo la referencia de v0.2 hasta que el Rol 4 los actualice.

1. **Preparación.**
   - Valida que `clima.zona.id === entrada.parcela.ubicacion.zonaId`.
   - `umbralRacha = reglas.rachaRelevanteDias + (reglas.suelos[tipoLocal]?.ajusteRachaDias ?? 0)`.
   - **Días secos relevantes:** todas las fechas dentro de rachas con `dias >= umbralRacha`, de todas las temporadas.
   - **Días de calor relevantes:** todas las fechas dentro de episodios de calor con `dias >= reglas.episodioCalorRelevanteDias`.
2. **Días críticos por plan y año.** Para cada año `Y` y cada ciclo del plan: siembra = `Y-MM-DD`; cada etapa con `sensibilidad === "alta"` aporta los días de siembra + `desdeDia` a siembra + `hastaDia`. Si dos cultivos tienen días críticos la misma fecha, cuentan los dos. Solo se analiza el año si todos sus días críticos caen en temporadas con `completa: true`.
3. **Rachas secas.** Exposición del año = días críticos dentro de días secos relevantes ÷ días críticos. `valor` = promedio de los años analizados; `puntaje = 1 − valor`. `aniosAfectados` = años con exposición mayor que 0.
4. **Estrés por calor.** Igual que el paso 3, con los días de calor relevantes.
5. **Cobertura del suelo.** Un mes está cubierto si algún ciclo está en pie al menos `diasMinimosPorMes` días; usa un año no bisiesto de referencia. `puntaje = 1 − mesesDescubierto / 12`.
6. **Atributos.** `fijacionNitrogeno` e `ingresoForraje`: `puntaje = reglas.niveles[plan.atributos.<criterio>]`.
7. **Total.** `puntajeTotal = Σ peso × puntaje` con `pesosPorPrioridad[prioridad]`. `ranking` va de mayor a menor.
8. **Empates.** Por criterio, `mejores` = planes cuyo puntaje esté a `toleranciaEmpate[criterio]` o menos del mejor. `recomendados` = planes a `toleranciaEmpate.total` o menos del primer lugar.
9. **Riesgos calculados.** El motor agrega a `riesgos` de cada plan:
   - cada cultivo con `aptitud: "baja"` en el suelo elegido: «El caupí tiene aptitud baja en suelo ak'alche (por confirmar).»
   - si `rachasSecas.valor ≥ 0.25`: «Una cuarta parte o más de los días críticos cayó en racha seca en esta zona.»
10. **Explicaciones** en español simple y con números concretos: frecuencias («6 de 42 días», «25 de 28 años»), no decimales.
11. **Evidencia:** hasta 5 traslapes por criterio y por plan, primero los más largos.
12. **Copia a la salida** `zona`, `suelo`, `fuentes`, `temporadasAnalizadas` y los tres avisos fijos.
