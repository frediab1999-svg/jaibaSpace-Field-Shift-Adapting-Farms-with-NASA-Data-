# Contrato de datos v0.2 — Península de Yucatán

> **Dueño:** Rol 1, líder técnico. Si cambia algo, se sube la versión (`0.3`, `0.4`, …) y se avisa a todo el equipo.
>
> **Convenciones:**
> - Las claves van en español y en `camelCase`. Los identificadores (`id`) van en minúsculas, sin acentos y con guiones: `yuc-noroeste`, `tsekel`, `maiz-precoz`.
> - Las fechas completas usan `YYYY-MM-DD`. Las fechas de calendario que se repiten cada año usan `MM-DD`.
> - La lluvia va en mm y la temperatura en °C.
> - Un dato faltante es `null`, nunca `-999` ni `0`.
> - Todo dato inventado lleva `"esEjemplo": true`. Todo valor sin fuente va en `porConfirmar`.

## Cambios respecto a v0.1

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

```json
{
  "version": "0.2",
  "planes": [
    {
      "id": "actual",
      "nombre": "Maíz de temporal (práctica actual)",
      "esEjemplo": true,
      "descripcionCorta": "Una siembra de maíz con las primeras lluvias; el suelo queda sin cubrir en secas.",
      "ciclos": [
        { "cultivo": "maiz", "siembra": "06-15", "cosecha": "10-31", "proposito": "grano" }
      ],
      "atributos": { "fijacionNitrogeno": "bajo", "ingresoForraje": "medio" },
      "beneficios": ["Práctica conocida; no requiere semilla ni mano de obra adicional", "El rastrojo puede servir de forraje"],
      "riesgos": ["Suelo descubierto de noviembre a mayo: pierde humedad y materia orgánica"],
      "fuentes": ["pendiente: calendario agrícola SIAP/INIFAP para la península"],
      "porConfirmar": ["fecha real de siembra del productor"]
    },
    {
      "id": "cobertura",
      "nombre": "Maíz + leguminosa de cobertura",
      "esEjemplo": true,
      "descripcionCorta": "Maíz con mucuna o canavalia intercalada que mantiene el suelo cubierto en secas.",
      "ciclos": [
        { "cultivo": "maiz", "siembra": "06-15", "cosecha": "10-31", "proposito": "grano" },
        { "cultivo": "mucuna", "siembra": "07-15", "cosecha": "02-28", "proposito": "cobertura" }
      ],
      "atributos": { "fijacionNitrogeno": "alto", "ingresoForraje": "bajo" },
      "beneficios": ["Fija nitrógeno", "Cubre el suelo 9 meses y aporta materia orgánica", "Reduce maleza"],
      "riesgos": ["Puede competir por agua con el maíz en la floración", "Si se siembra temprano, trepa sobre el maíz", "Requiere conseguir semilla"],
      "fuentes": ["pendiente: experiencias de abonos verdes en la península (INIFAP, CIMMYT)"],
      "porConfirmar": ["disponibilidad de semilla de cobertura", "fecha de intercalado"]
    },
    {
      "id": "milpa",
      "nombre": "Milpa (maíz, frijol y calabaza)",
      "esEjemplo": true,
      "descripcionCorta": "La asociación tradicional maya: maíz, frijol y calabaza en la misma parcela.",
      "ciclos": [
        { "cultivo": "maiz", "siembra": "06-15", "cosecha": "10-31", "proposito": "grano" },
        { "cultivo": "frijol", "siembra": "06-15", "cosecha": "09-15", "proposito": "grano" },
        { "cultivo": "calabaza", "siembra": "06-15", "cosecha": "10-15", "proposito": "fruto y semilla" }
      ],
      "atributos": { "fijacionNitrogeno": "medio", "ingresoForraje": "alto" },
      "beneficios": ["Tres cosechas: diversifica el ingreso y la alimentación", "El frijol aporta nitrógeno", "La calabaza cubre el suelo en lluvias"],
      "riesgos": ["Más mano de obra", "La floración del frijol en julio puede caer en la sequía de medio verano"],
      "fuentes": ["pendiente: literatura sobre milpa maya (INIFAP, ECOSUR)"],
      "porConfirmar": ["variedades locales de frijol y calabaza"]
    },
    {
      "id": "relevo",
      "nombre": "Maíz precoz + frijol de relevo",
      "esEjemplo": true,
      "descripcionCorta": "Maíz de ciclo corto sembrado más tarde y, al final de las lluvias, frijol que aprovecha la humedad que queda.",
      "ciclos": [
        { "cultivo": "maiz-precoz", "siembra": "07-01", "cosecha": "10-15", "proposito": "grano" },
        { "cultivo": "frijol", "siembra": "10-01", "cosecha": "12-31", "proposito": "grano" }
      ],
      "atributos": { "fijacionNitrogeno": "medio", "ingresoForraje": "alto" },
      "beneficios": ["Dos cosechas al año", "El suelo queda cubierto hasta diciembre", "La siembra de julio esquiva parte del calor de junio"],
      "riesgos": ["El frijol de relevo florece al inicio de las secas", "Depende de la humedad residual del suelo", "Requiere semilla de maíz precoz"],
      "fuentes": ["pendiente: INIFAP (variedades precoces para la península)"],
      "porConfirmar": ["disponibilidad de variedad precoz", "humedad residual en el suelo de la parcela"]
    }
  ]
}
```

- `siembra` y `cosecha` usan `MM-DD`. Si `cosecha` es anterior a `siembra`, el ciclo continúa al año siguiente.
- `cultivo` debe existir como clave en `reglas.json → cultivos`.
- `atributos` usa los niveles `"bajo"`, `"medio"` o `"alto"`. Cada nivel necesita una fuente en `fuentes` o una entrada en `porConfirmar`.
- `beneficios` y `riesgos` son frases cortas en lenguaje de productor. El motor agrega riesgos calculados (ver sección 8).

## 4. `reglas.json` (Rol 3)

```json
{
  "version": "0.2",
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
    "maiz-precoz": {
      "nombre": "Maíz de ciclo corto",
      "etapas": [
        { "id": "establecimiento", "nombre": "Germinación y establecimiento", "desdeDia": 0,  "hastaDia": 15, "sensibilidad": "alta" },
        { "id": "floracion",       "nombre": "Floración",                     "desdeDia": 45, "hastaDia": 60, "sensibilidad": "alta" },
        { "id": "llenado",         "nombre": "Llenado de grano",              "desdeDia": 61, "hastaDia": 80, "sensibilidad": "media" }
      ],
      "fuentes": ["pendiente: INIFAP"]
    },
    "frijol": {
      "nombre": "Frijol",
      "etapas": [
        { "id": "establecimiento", "nombre": "Establecimiento",    "desdeDia": 0,  "hastaDia": 15, "sensibilidad": "media" },
        { "id": "floracion",       "nombre": "Floración",          "desdeDia": 30, "hastaDia": 45, "sensibilidad": "alta" },
        { "id": "llenado",         "nombre": "Llenado de vaina",   "desdeDia": 46, "hastaDia": 65, "sensibilidad": "media" }
      ],
      "fuentes": ["pendiente: FAO-56 / INIFAP"]
    },
    "calabaza": {
      "nombre": "Calabaza",
      "etapas": [
        { "id": "establecimiento", "nombre": "Establecimiento", "desdeDia": 0,  "hastaDia": 15, "sensibilidad": "media" },
        { "id": "floracion",       "nombre": "Floración",       "desdeDia": 35, "hastaDia": 50, "sensibilidad": "media" }
      ],
      "fuentes": ["pendiente"]
    },
    "mucuna": {
      "nombre": "Mucuna (frijol terciopelo)",
      "etapas": [
        { "id": "establecimiento", "nombre": "Establecimiento", "desdeDia": 0, "hastaDia": 20, "sensibilidad": "media" }
      ],
      "fuentes": ["pendiente"]
    }
  },
  "suelos": {
    "tsekel": {
      "nombre": "Tsek'el (pedregoso y poco profundo)",
      "equivalenteWRB": "Leptosol",
      "ajusteRachaDias": -1,
      "aptitud": { "maiz": "media", "maiz-precoz": "media", "frijol": "media", "calabaza": "media", "mucuna": "media" },
      "nota": "Retiene poca agua: el cultivo se estresa con menos días secos."
    },
    "kankab": {
      "nombre": "K'ankab (rojo y más profundo)",
      "equivalenteWRB": "Luvisol",
      "ajusteRachaDias": 0,
      "aptitud": { "maiz": "alta", "maiz-precoz": "alta", "frijol": "alta", "calabaza": "alta", "mucuna": "alta" },
      "nota": "Mejor retención de agua; el suelo más apto para la milpa."
    },
    "akalche": {
      "nombre": "Ak'alche (bajo que se inunda)",
      "equivalenteWRB": "Gleysol / Vertisol",
      "ajusteRachaDias": 1,
      "aptitud": { "maiz": "baja", "maiz-precoz": "baja", "frijol": "baja", "calabaza": "media", "mucuna": "media" },
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
  "version": "0.2",
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
  "planes": ["actual", "cobertura", "milpa", "relevo"]
}
```

- `origen` es `"gps"` o `"lista"`. `prioridad` es una clave de `reglas.prioridades`.
- `zonaId` es la zona cuyo punto está más cerca (Haversine) y `distanciaZonaKm` es la distancia a ese punto, redondeada a 1 decimal.
- `suelo.tipoLocal` es una clave de `reglas.suelos` o `null` ("no sé").
- `planes` incluye `"actual"` y al menos 3 ids en total.
- Si un campo de la parcela es `null`, el motor lo agrega a `datosPendientes`. No lo inventa.

**Firma:**

```js
// Función pura y síncrona. No hace fetch dentro de la función.
// `clima` es el archivo de la zona de entrada.parcela.ubicacion.zonaId.
comparar(entrada, { clima, planes, reglas }) -> salida
```

## 7. Salida de `comparar()` (Rol 4 → Rol 6)

Ejemplo para la parcela de la sección 6. Los valores salen del cálculo exploratorio con los datos reales de `yuc-noroeste` y las reglas provisionales; el motor real los recalcula.

```json
{
  "version": "0.2",
  "generado": "2026-11-14T15:00:00Z",
  "prioridad": "agua",
  "pesosAplicados": { "rachasSecas": 0.45, "estresCalor": 0.20, "coberturaSuelo": 0.15, "fijacionNitrogeno": 0.10, "ingresoForraje": 0.10 },
  "zona": { "id": "yuc-noroeste", "nombre": "Noroeste de Yucatán", "estado": "Yucatán", "distanciaKm": 0 },
  "suelo": { "tipo": "tsekel", "nombre": "Tsek'el (pedregoso y poco profundo)", "umbralRachaDias": 4 },
  "planes": [
    {
      "id": "actual",
      "nombre": "Maíz de temporal (práctica actual)",
      "descripcionCorta": "Una siembra de maíz con las primeras lluvias; el suelo queda sin cubrir en secas.",
      "calendario": [
        {
          "cultivo": "maiz", "nombreCultivo": "Maíz", "siembra": "06-15", "cosecha": "10-31",
          "etapasCriticas": [
            { "id": "establecimiento", "nombre": "Germinación y establecimiento", "inicio": "06-15", "fin": "07-05" },
            { "id": "floracion", "nombre": "Floración (espiga y jilote)", "inicio": "08-09", "fin": "08-29" }
          ]
        }
      ],
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
        "ingresoForraje": { "nivel": "medio", "puntaje": 0.5, "explicacion": "Una cosecha de grano y rastrojo para forraje." }
      },
      "puntajeTotal": 0.68,
      "posicion": 4,
      "porQue": "Con prioridad en el agua, este plan se expone a la sequía igual que la cobertura, pero deja el suelo descubierto 7 meses y no aporta nitrógeno.",
      "beneficios": ["Práctica conocida; no requiere semilla ni mano de obra adicional", "El rastrojo puede servir de forraje"],
      "riesgos": ["Suelo descubierto de noviembre a mayo: pierde humedad y materia orgánica"],
      "datosNasa": [
        { "parametro": "IMERG_PRECTOT", "descripcion": "Lluvia diaria GPM IMERG vía NASA POWER, 1998–2025", "fechaCorte": "2025-12-31" },
        { "parametro": "T2M_MAX", "descripcion": "Temperatura máxima diaria MERRA-2 vía NASA POWER, 1998–2025", "fechaCorte": "2025-12-31" }
      ],
      "faltaConfirmar": ["fecha real de siembra del productor"]
    }
  ],
  "ranking": [
    { "id": "cobertura", "puntajeTotal": 0.78, "posicion": 1 },
    { "id": "milpa",     "puntajeTotal": 0.77, "posicion": 2 },
    { "id": "relevo",    "puntajeTotal": 0.71, "posicion": 3 },
    { "id": "actual",    "puntajeTotal": 0.68, "posicion": 4 }
  ],
  "comparacion": {
    "porCriterio": {
      "rachasSecas":       { "mejores": ["actual", "cobertura", "milpa"], "sinDiferencia": false },
      "estresCalor":       { "mejores": ["relevo", "actual", "cobertura"], "sinDiferencia": false },
      "coberturaSuelo":    { "mejores": ["cobertura"], "sinDiferencia": false },
      "fijacionNitrogeno": { "mejores": ["cobertura"], "sinDiferencia": false },
      "ingresoForraje":    { "mejores": ["milpa", "relevo"], "sinDiferencia": false }
    },
    "recomendados": ["cobertura", "milpa"],
    "mensaje": "Con prioridad en el agua, la cobertura y la milpa quedan prácticamente empatadas: las dos resisten la sequía como tu plan actual, la cobertura cuida más el suelo y la milpa da más ingreso."
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

> En el ejemplo solo aparece el detalle de `actual`; la salida real incluye los 4 planes con la misma estructura.

**Valores posibles:**
- `comparacion.porCriterio.<criterio>.mejores`: ids de los planes empatados en el mejor puntaje. Si todos empatan, `sinDiferencia: true`.
- `comparacion.recomendados`: uno o más ids. Más de uno significa empate técnico.

## 8. Algoritmo de referencia del motor

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
   - cada cultivo con `aptitud: "baja"` en el suelo elegido: «El frijol tiene aptitud baja en suelo ak'alche (por confirmar).»
   - si `rachasSecas.valor ≥ 0.25`: «Una cuarta parte o más de los días críticos cayó en racha seca en esta zona.»
10. **Explicaciones** en español simple y con números concretos: frecuencias («6 de 42 días», «25 de 28 años»), no decimales.
11. **Evidencia:** hasta 5 traslapes por criterio y por plan, primero los más largos.
12. **Copia a la salida** `zona`, `suelo`, `fuentes`, `temporadasAnalizadas` y los tres avisos fijos.
