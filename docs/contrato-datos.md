# Contrato de datos v0.1 (propuesta)

> **Dueño:** Rol 1, líder técnico. Esta es una propuesta inicial para que todos empiecen ya. Si el líder cambia algo, sube la versión (`0.2`, `0.3`, …) y avisa a todo el equipo.
>
> **Convenciones:**
> - Las claves van en español y en `camelCase`.
> - Las fechas completas usan `YYYY-MM-DD`. Las fechas de calendario que se repiten cada año usan `MM-DD`.
> - La lluvia va en mm y la temperatura en °C.
> - Un dato faltante es `null`, nunca `-999` ni `0`.
> - Todo dato inventado lleva `"esEjemplo": true`.

Archivos que define este contrato:

| Archivo | Lo produce | Lo consume |
|---|---|---|
| `app/data/clima.json` | Rol 2 | Rol 4 (motor) y Rol 6 (fuente y fecha) |
| `app/data/planes.json` | Rol 3 | Rol 4 y Rol 6 |
| `app/data/reglas.json` | Rol 3 | Rol 4 |
| `app/data/parcela-ejemplo.json` | Roles 1 y 5 | Rol 5 |
| Entrada de `comparar(entrada)` | Rol 5 | Rol 4 |
| Salida de `comparar(entrada)` | Rol 4 | Rol 6 |

---

## 1. `clima.json` (Rol 2)

```json
{
  "version": "0.1",
  "esEjemplo": false,
  "ubicacion": {
    "lat": 20.49,
    "lon": -89.75,
    "elevacionM": 24.93,
    "municipio": "por confirmar",
    "estado": "Yucatán"
  },
  "fuente": {
    "nombre": "NASA POWER Daily API",
    "versionApi": "v2.10.3",
    "producto": "GPM IMERG",
    "parametro": "IMERG_PRECTOT",
    "unidades": "mm/día",
    "resolucionAprox": "0.1° (~10 km)",
    "url": "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=IMERG_PRECTOT&community=AG&longitude=-89.75&latitude=20.49&start=19980101&end=20251231&format=JSON&time-standard=UTC",
    "timeStandard": "UTC",
    "fechaDescarga": "2026-11-14",
    "fechaCorte": "2025-12-31",
    "primerDatoValido": "1998-01-01"
  },
  "definiciones": {
    "umbralDiaSecoMm": 1.0,
    "rachaMinimaReportadaDias": 3,
    "ventanaResumen": { "inicio": "06-01", "fin": "08-31" },
    "tratamientoFaltantes": "null; un día null corta la racha y no cuenta como seco"
  },
  "temporadas": [
    {
      "anio": 2025,
      "diasConDato": 365,
      "diasEsperados": 365,
      "ventana": {
        "diasConDato": 92,
        "diasEsperados": 92,
        "lluviaMm": 468.75,
        "rachaMasLarga": { "dias": 12, "inicio": "2025-06-06", "fin": "2025-06-17" }
      },
      "rachas": [
        { "inicio": "2025-06-06", "fin": "2025-06-17", "dias": 12 }
      ]
    }
  ],
  "resumen": {
    "aniosCompletos": 28,
    "medianaRachaMasLargaDias": 7,
    "peoresAnios": [
      { "anio": 1998, "dias": 18, "inicio": "1998-06-02", "fin": "1998-06-19" },
      { "anio": 2025, "dias": 12, "inicio": "2025-06-06", "fin": "2025-06-17" },
      { "anio": 2014, "dias": 11, "inicio": "2014-06-08", "fin": "2014-06-18" }
    ]
  }
}
```

- `temporadas[].rachas` contiene **todas** las rachas de 3 días o más del año completo, no solo las de la ventana. Así el motor puede cruzarlas con cualquier calendario de cultivo.
- Si una racha cruza el 31 de diciembre, se corta en esa fecha.
- Opcional: `app/data/clima-diario.json` con `{ "fechas": [...], "lluviaMm": [...], "tMaxC": [...] }` si el Rol 6 quiere graficar.

## 2. `planes.json` (Rol 3)

```json
{
  "version": "0.1",
  "planes": [
    {
      "id": "actual",
      "nombre": "Maíz de temporal (práctica actual)",
      "esEjemplo": true,
      "descripcionCorta": "Una siembra de maíz con las primeras lluvias y suelo sin cubrir en secas.",
      "ciclos": [
        { "cultivo": "maiz", "siembra": "06-15", "cosecha": "10-31", "proposito": "grano" }
      ],
      "fuentes": ["pendiente: calendario agrícola SIAP/INIFAP para Yucatán"],
      "porConfirmar": ["fecha real de siembra del productor"]
    },
    {
      "id": "rotacion",
      "nombre": "Maíz + leguminosa de cobertura",
      "esEjemplo": true,
      "descripcionCorta": "Maíz con una leguminosa de cobertura que mantiene el suelo cubierto en secas.",
      "ciclos": [
        { "cultivo": "maiz", "siembra": "06-15", "cosecha": "10-31", "proposito": "grano" },
        { "cultivo": "mucuna", "siembra": "07-15", "cosecha": "02-28", "proposito": "cobertura" }
      ],
      "fuentes": ["pendiente"],
      "porConfirmar": ["disponibilidad de semilla de cobertura"]
    }
  ]
}
```

- `siembra` y `cosecha` usan el formato `MM-DD`. Si `cosecha` es anterior a `siembra`, el ciclo continúa al año siguiente.
- `cultivo` debe existir como clave en `reglas.json → cultivos`.

## 3. `reglas.json` (Rol 3)

```json
{
  "version": "0.1",
  "umbralDiaSecoMm": 1.0,
  "rachaRelevanteDias": 5,
  "cultivos": {
    "maiz": {
      "nombre": "Maíz",
      "etapas": [
        { "id": "establecimiento", "nombre": "Germinación y establecimiento", "desdeDia": 0,  "hastaDia": 20,  "sensibilidad": "media" },
        { "id": "floracion",       "nombre": "Floración (espiga y jilote)",   "desdeDia": 55, "hastaDia": 75,  "sensibilidad": "alta"  },
        { "id": "llenado",         "nombre": "Llenado de grano",              "desdeDia": 76, "hastaDia": 100, "sensibilidad": "media" }
      ],
      "fuentes": ["pendiente: FAO-56 / INIFAP"]
    },
    "mucuna": {
      "nombre": "Mucuna (frijol terciopelo)",
      "etapas": [
        { "id": "establecimiento", "nombre": "Establecimiento", "desdeDia": 0, "hastaDia": 20, "sensibilidad": "media" }
      ],
      "fuentes": ["pendiente"]
    }
  },
  "cobertura": {
    "diasMinimosPorMes": 15,
    "nota": "Un mes cuenta como cubierto si algún ciclo está en pie al menos 15 días de ese mes."
  },
  "pesosPorPrioridad": {
    "agua":      { "rachasSecas": 0.7, "coberturaSuelo": 0.3 },
    "cobertura": { "rachasSecas": 0.3, "coberturaSuelo": 0.7 }
  },
  "toleranciaEmpate": {
    "rachasSecas": 0.05,
    "coberturaSuelo": 1,
    "total": 0.02
  },
  "esEjemplo": true
}
```

- `desdeDia` y `hastaDia` cuentan los días desde la siembra del ciclo.
- `toleranciaEmpate.rachasSecas` es una diferencia de proporción de años (0.05 equivale a 5 puntos porcentuales). `coberturaSuelo` está en meses.

## 4. Entrada de `comparar(entrada)` (Rol 5 → Rol 4)

```json
{
  "version": "0.1",
  "parcela": {
    "id": "ejemplo-01",
    "esEjemplo": true,
    "nombre": "Parcela de ejemplo",
    "ubicacion": {
      "lat": 20.49,
      "lon": -89.75,
      "municipio": "por confirmar",
      "origen": "lista"
    },
    "modalidad": "temporal",
    "cultivoActual": "maiz",
    "cicloAnterior": { "cultivo": null, "fechaSiembra": null },
    "suelo": { "tipoLocal": null, "profundidad": null, "pedregosidad": null }
  },
  "prioridad": "agua",
  "planes": ["actual", "rotacion"]
}
```

- `origen` es `"gps"` o `"lista"`. `prioridad` es `"agua"` o `"cobertura"`.
- Si un campo de la parcela está en `null`, el motor lo pone en `datosPendientes`. No lo inventa.

**Firma:**

```js
// Función pura y síncrona. No hace fetch dentro de la función.
comparar(entrada, { clima, planes, reglas }) -> salida
```

## 5. Salida de `comparar(entrada)` (Rol 4 → Rol 6)

```json
{
  "version": "0.1",
  "generado": "2026-11-14T15:00:00Z",
  "prioridad": "agua",
  "pesosAplicados": { "rachasSecas": 0.7, "coberturaSuelo": 0.3 },
  "planes": [
    {
      "id": "actual",
      "nombre": "Maíz de temporal (práctica actual)",
      "calendario": [
        {
          "cultivo": "maiz",
          "siembra": "06-15",
          "cosecha": "10-31",
          "etapasSensibles": [
            { "id": "floracion", "nombre": "Floración", "inicio": "08-09", "fin": "08-29", "sensibilidad": "alta" }
          ]
        }
      ],
      "criterios": {
        "rachasSecas": {
          "valor": 0.18,
          "unidad": "proporción de temporadas con etapa sensible alta afectada",
          "aniosAfectados": 5,
          "aniosAnalizados": 28,
          "puntaje": 0.82,
          "explicacion": "En 5 de 28 temporadas, la floración del maíz coincidió con una racha seca de 5 días o más.",
          "evidencia": [
            { "anio": 2025, "etapa": "establecimiento", "rachaInicio": "2025-06-06", "rachaFin": "2025-06-17", "diasRacha": 12, "diasTraslape": 3 }
          ]
        },
        "coberturaSuelo": {
          "mesesDescubierto": 7,
          "mesesCubiertos": ["06", "07", "08", "09", "10"],
          "puntaje": 0.42,
          "explicacion": "El suelo queda descubierto de noviembre a mayo."
        }
      },
      "puntajeTotal": 0.70,
      "porQue": "Con prioridad en agua, este plan tiene la misma exposición a rachas secas, pero deja el suelo descubierto 7 meses.",
      "datoNasa": {
        "parametro": "IMERG_PRECTOT",
        "descripcion": "Lluvia diaria GPM IMERG vía NASA POWER, 1998–2025",
        "fechaCorte": "2025-12-31"
      },
      "faltaConfirmar": ["Fecha real de siembra del productor"]
    }
  ],
  "comparacion": {
    "rachasSecas": "empate",
    "coberturaSuelo": "rotacion",
    "recomendado": "rotacion",
    "mensaje": "Empatan en exposición a sequía; la rotación mantiene el suelo cubierto más meses."
  },
  "fuente": {
    "nombre": "NASA POWER / GPM IMERG",
    "url": "https://power.larc.nasa.gov/",
    "fechaCorte": "2025-12-31",
    "fechaDescarga": "2026-11-14"
  },
  "temporadasAnalizadas": { "desde": 1998, "hasta": 2025 },
  "datosPendientes": ["Cultivo del ciclo anterior", "Tipo de suelo local (p. ej., tsek'el o k'ankab)"],
  "avisos": ["Comparación de exposición histórica; no es un pronóstico de cosecha."]
}
```

> Los números de este ejemplo son **ilustrativos**. La salida real la calcula el motor.

**Valores posibles en `comparacion`:**
- `rachasSecas` y `coberturaSuelo`: `"actual"`, `"rotacion"` o `"empate"`.
- `recomendado`: un `id` de plan o `"empate"`.

## 6. Algoritmo de referencia del motor

1. **Exposición a rachas secas, por plan:**
   - Para cada temporada completa en `clima.temporadas` y cada ciclo del plan, calcula las fechas reales de cada etapa: fecha de siembra + `desdeDia` hasta fecha de siembra + `hastaDia`.
   - Busca rachas de `rachaRelevanteDias` días o más que se traslapen con esa etapa.
   - Cuenta la temporada como afectada si se traslapa al menos una etapa con sensibilidad `alta`.
   - `valor = aniosAfectados / aniosAnalizados` y `puntaje = 1 − valor`.
2. **Cobertura del suelo, por plan:**
   - Un mes está cubierto si algún ciclo está en pie al menos `diasMinimosPorMes` días.
   - `puntaje = 1 − mesesDescubierto / 12`.
3. **Total:** `puntajeTotal = Σ peso × puntaje`, con los pesos de `pesosPorPrioridad[prioridad]`.
4. **Empates:** si la diferencia entre planes en un criterio es menor o igual que su `toleranciaEmpate`, el resultado de ese criterio es `"empate"`. Lo mismo aplica a `recomendado` con la tolerancia `total`.
5. **Evidencia:** se guardan los traslapes en `evidencia`, empezando por los más largos. Con 5 basta para la interfaz.
