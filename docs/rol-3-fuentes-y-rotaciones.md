# Rol 3: tres estrategias de rotación para Umán (Noroeste de Yucatán)

> **Para quién:** el responsable del Rol 3 (reglas agrícolas) y su IA. La sección 11 está dirigida a todo el equipo.
> **Estado:** versión 5, para revisión en el PR hacia `develop`. Fecha de consulta de fuentes y API: **2026‑11‑14**.
> **Formato:** contrato de datos **v0.3** (commit `282f646`): tres estrategias de dos ciclos en secuencia, cinco criterios y cuatro prioridades. Cambios respecto al v0.3: cultivo `soya`, suelos con clases WRB (`leptosol`, `luvisol`) y dos campos opcionales, `trazabilidad` y `advertenciaIngreso`.
> **Archivos:** [app/data/planes.json](../app/data/planes.json) y [app/data/reglas.json](../app/data/reglas.json).
> **Regla:** todo dato agrícola de los JSON viene de una **fuente oficial**: gobierno de México (INIFAP, INEGI, SADER/DGSIAP, SEPLAN Yucatán, Gobierno de Yucatán), NASA, FAO, USDA o Gobierno de Canadá. Los parámetros del modelo (pesos, tolerancias, umbrales de racha y calor) no son datos agrícolas: son reglas del contrato y se declaran como tales (sección 1.1).

---

## 0. Resumen en 10 puntos

1. **Tres estrategias, todas de rotación en secuencia y sin asociación:** `actual` (maíz → maíz), `cobertura` (canavalia → maíz) y `otro-grano` (**soya Huasteca 300** → maíz).
2. **Por qué soya:** en la Agenda Técnica Agrícola Yucatán 2026 del INIFAP, los únicos cultivos anuales de temporal son maíz, frijol y soya. El frijol sale porque en milpa se siembra en asociación o relevo con maíz (p. 27). La soya tiene paquete oficial completo: fechas de siembra, días a floración y a madurez, suelos y fijación de nitrógeno.
3. **Se retiran las fuentes no oficiales:** el pasto andropogon (respaldado solo por Feedipedia), la mucuna y el caupí no tienen calendario en fuentes oficiales.
4. **El éxito no es obligatorio:** la soya tiene malas condiciones en Umán (suelo pedregoso, menos lluvia que la zona sojera) y así se declara. La app debe mostrar que el cultivo puede fallar.
5. **Zona y punto:** `yuc-noroeste` usa 20.834, −89.787 (commit `ab65508` de `develop`). Umán pertenece a la Región II Noroeste (SEPLAN, p. 6).
6. **Etapas oficiales:** el maíz usa las etapas de FAO‑56 (20, 35 y 40 días) con cosecha a 143 días (INIFAP: 140–150). La soya usa floración a los 40 días y madurez a los 115 (INIFAP), con 15 días de etapa final (FAO‑56). La sensibilidad sigue la FAO TM3.
7. **Suelos:** se usan las clases WRB del INEGI y el INIFAP (Leptosol y Luvisol). Los nombres tsek'el y ak'alche se retiran porque no aparecen en fuentes oficiales. El ajuste de racha por suelo queda en 0 porque no hay fuente oficial para su magnitud.
8. **Resultado calculado** (IMERG 1998–2025): 8.6 %, 8.6 % y 8.7 % de días críticos en racha. Meses cubiertos en los dos ciclos: **10, 15 y 9 de 24**.
9. **Cada estrategia gana en algo:** `cobertura` gana en suelo y nitrógeno, y `otro-grano` gana en ingreso. En agua empatan `otro-grano` y `cobertura`.
10. **El ingreso es variable:** `planes.json` incluye una advertencia de que los valores de referencia pueden no cumplirse y de que el cultivo puede fallar.

---

## 1. Cómo se clasifica cada dato

| Estado | Significado | Ejemplo |
|---|---|---|
| `verificado_fuente` | Dato respaldado por una fuente oficial identificada | Soya Huasteca 300: madurez a 115 días (INIFAP) |
| `simulado_demo` | Elección del productor ficticio dentro de un rango oficial | Siembra el 15 de junio, primer día de la ventana oficial |
| `decision_modelo` | Regla del modelo o del contrato, no dato agrícola | Pesos por prioridad; racha de 5 días |
| `pendiente_validacion_campo` | Supuesto que solo se precisa con observaciones reales | Persistencia de la canavalia hasta marzo |
| `calculado` | Resultado reproducible con entradas oficiales declaradas | 8.6 % de días críticos en racha |

### 1.1 Lo que queda como `decision_modelo` y por qué

| Campo | Motivo |
|---|---|
| `rachaRelevanteDias` (5), `umbralCalorC` (35 °C), `episodioCalorRelevanteDias` (3) | Parámetros del contrato v0.3 y del pipeline del Rol 2. Las fuentes oficiales revisadas no dan umbral de calor para maíz, canavalia ni soya. |
| `cobertura.diasMinimosPorMes`, `niveles`, `pesosPorPrioridad`, `toleranciaEmpate` | Reglas de puntuación del contrato v0.3 |
| `suelos.*.ajusteRachaDias` = 0 | No hay fuente oficial para la magnitud; con 0 no altera nada |
| Canavalia sin etapa `alta` | La sensibilidad alta de la FAO TM3 es la de la formación del rendimiento, y la canavalia no se cosecha |
| Niveles relativos de `fijacionNitrogeno` e `ingresoForraje` | El contrato pide bajo, medio o alto. El orden sale de datos oficiales (sección 6.3). |
| Elección de la soya | Decisión del equipo con base en el INIFAP |

---

## 2. Ubicación: Umán

| Dato | Valor | Estado | Fuente |
|---|---|---|---|
| Zona del MVP | `yuc-noroeste`, punto **20.834, −89.787** | `verificado_fuente` | `app/data/zonas.json` en `develop` (commit `ab65508`) |
| Parcela de ejemplo | El mismo punto: zona rural, a 6.2 km del límite municipal y a 2.5 km de Poxilá | `simulado_demo` | Prueba de punto en polígono con el Marco Geoestadístico INEGI, dic. 2025 [F03] |
| Municipio y clave | Umán, **31101** | `verificado_fuente` | [F02], [F03] |
| Región | **II Noroeste** (cabecera Mérida, 20 municipios) | `verificado_fuente` | SEPLAN Yucatán, p. 6 [F17] |
| Clima | El punto y la cabecera tienen series IMERG idénticas y comparten celda MERRA‑2 | `calculado` | NASA POWER [F07] |
| Uso agrícola del punto | La imagen HLS del 15‑abr‑2025 muestra franjas desmontadas compatibles con parcelas; MODIS, a 500 m, no distingue parcelas | `pendiente_validacion_campo` | [F08], [F12] |

### 2.1 Contexto oficial

| Tema | Dato | Fuente |
|---|---|---|
| Clima de Umán | Cálido subhúmedo con lluvias en verano (97.3 %); de 24 a 28 °C; de 700 a 1 100 mm | INEGI [F02] |
| Suelo de Umán | Leptosol 56.66 %, Phaeozem 38.61 % | [F02] |
| Uso del suelo | Selva 76.46 %, agricultura 17.89 %, zona urbana 4.49 % | [F02] |
| Maíz de temporal en Umán (PV) | 100 ha; 0.59 t/ha en 2024 y 0.77 t/ha en 2025; 4 217 $/ha de valor bruto en 2025 | DGSIAP [F16] |
| Cultivos anuales de temporal en el Noroeste (2025) | Solo maíz grano (1 845 ha) | [F16] |
| Soya de temporal en Yucatán (PV, 2025) | 7 664 ha en Tekax y Oxkutzcab; 2.20 t/ha; 15 934 $/ha. En Umán no hay registros. | [F16] |
| Soya según el INIFAP | Se siembra en suelos k'ankab y yaax-hom (Luvisoles), profundos y mecanizados del Cono Sur, con más de 1 100 mm de lluvia al año | INIFAP pp. 75–76 [F01] |
| Sistema de maíz | En milpa predominan Leptosoles y Rendzinas, pedregosos y someros; rendimiento tradicional de ~0.7 t/ha | INIFAP p. 53 [F01] |
| Lluvia anual en el punto | Mediana de 1 036 mm (IMERG 1998–2025) | `calculado` [F07] |

---

## 3. Auditoría: qué fuentes son oficiales

| Fuente | ¿Oficial? | Uso en la versión 5 |
|---|---|---|
| INIFAP, Agenda Técnica Agrícola Yucatán 2026 | **Sí** (gobierno de México) | Maíz, soya y suelos. Las páginas de frijol explican por qué sale. |
| INEGI: compendios municipales y Marco Geoestadístico | **Sí** | Ubicación y suelos de Umán |
| SADER/DGSIAP, cierre agrícola 2024–2025 | **Sí** | Superficie, rendimiento y valor de maíz y soya |
| SEPLAN Yucatán, guía de comisiones regionales | **Sí** | Región II Noroeste |
| Gobierno de Yucatán, Programa Estatal de Ordenamiento Territorial | **Sí** | Se revisó: no define tsek'el ni ak'alche |
| NASA POWER, GPM IMERG, MERRA‑2, HLS (GIBS), MODIS (ORNL DAAC) | **Sí** | Clima y ubicación |
| FAO TM3 y FAO‑56 | **Sí** (ONU) | Etapas y sensibilidad de maíz y soya |
| USDA‑NRCS Plant Guide de canavalia | **Sí** (gobierno de EE. UU.) | Base de la canavalia |
| Gobierno de Canadá, índices climáticos (CDD) | **Sí** | Definición de día seco (< 1 mm) |
| SENASICA, boletín de gusano cogollero | Sí | Solo contexto |
| USDA‑ARS, hoja de mucuna | Sí, pero sin calendario ni fenología | No sirve para el modelo |
| **Feedipedia** (INRAE, CIRAD, AFZ y FAO) | **No:** programa mixto con institutos de investigación | **Retirada** junto con el pasto andropogon |
| Artículos científicos, CIMMYT, CICY, Wikipedia, Bautista y Zinck 2010, Tropical Forages | **No** | No se usan |

---

## 4. Cambios de la versión 5

| Tema | Decisión | Base |
|---|---|---|
| Plan 3 | `otro-grano` = soya Huasteca 300 → maíz. Vuelve el id del contrato v0.3 y sale el id `forraje`. | F01 pp. 75–83; F04; F05; F16 |
| Pasto andropogon | Sale: solo tenía respaldo de Feedipedia, que no es oficial | — |
| Etapas del maíz | Pasan a FAO‑56 (20/35/40 días) con sensibilidad FAO TM3: la etapa `alta` va del día 55 al 94 | F05, F04, F01 |
| Etapas de la canavalia | Dos etapas derivadas de la USDA (85 % de cobertura a 60 días) en lugar de límites propios | F09, F04 |
| Suelos | Claves `leptosol` y `luvisol` en lugar de `tsekel`, `kankab` y `akalche`; ajuste de racha en 0 | F02, F01, F18 |
| Ingreso | `advertenciaIngreso`: los valores son de referencia y el cultivo puede fallar | Decisión del equipo |

---

## 5. Clima del punto (NASA POWER, IMERG y MERRA‑2, 1998–2025)

| Mes | Lluvia (mm, mediana) | Días con Tmax ≥ 35 °C | GWETROOT |
|---|---:|---:|---:|
| Ene | 23.6 | 0 | 0.52 |
| Feb | 7.2 | 0 | 0.50 |
| Mar | 10.6 | 4.5 | 0.48 |
| Abr | 24.0 | 11.5 | 0.48 |
| May | 59.9 | 13 | 0.49 |
| **Jun** | **172.8** | 1 | 0.56 |
| Jul | 147.0 | 0 | 0.58 |
| Ago | 160.8 | 0 | 0.60 |
| Sep | 163.7 | 0 | 0.62 |
| Oct | 106.4 | 0 | 0.63 |
| Nov | 46.3 | 0 | 0.58 |
| Dic | 18.9 | 0 | 0.55 |
| **Año** | **1 036** | | |

- Junio es el primer mes de lluvia abundante. Sembrar maíz, canavalia y soya el 15‑jun cae dentro de las ventanas oficiales.
- El INIFAP dice que la principal limitante de la soya es que el llenado de grano no coincida con septiembre, el mes de mayor probabilidad de lluvia (p. 79). Con siembra el 15‑jun, el llenado va de agosto a septiembre.
- La lluvia anual de Umán (1 036 mm) es menor que la de la zona sojera (más de 1 100 mm, INIFAP p. 76).
- Los días de 35 °C o más se concentran de marzo a mayo. La USDA indica que la canavalia crece mejor entre 57 y 81 °F (14–27 °C) y tira las hojas con calor extremo.

---

## 6. Las tres estrategias

| Plan | Ciclo 1 | Ciclo 2 | Objetivo | Cosechas |
|---|---|---|---|---|
| **`actual`** (continuo) | Maíz, 15‑jun → 5‑nov | Maíz, 15‑jun → 5‑nov | Cosechar maíz en ambos ciclos | 2 de maíz |
| **`cobertura`** (rotación) | Canavalia, 15‑jun → 31‑mar | Maíz, 15‑jun → 5‑nov | Cubrir el suelo un ciclo antes de volver al maíz | 1 de maíz |
| **`otro-grano`** (rotación) | Soya Huasteca 300, 15‑jun → 8‑oct | Maíz, 15‑jun → 5‑nov | Cosechar soya y volver al maíz | 1 de soya y 1 de maíz |

### 6.1 Por qué soya

| Candidato | ¿Todo oficial? | Motivo |
|---|---|---|
| **Soya** | **Sí** | Paquete INIFAP para Yucatán (pp. 75–83), etapa sensible en la FAO TM3, etapa final en FAO‑56 y valor oficial en el DGSIAP |
| Frijol negro (versión 3) | Sí, pero no cumple | En milpa se siembra en asociación o relevo con maíz (F01, p. 27); solo el sistema mecanizado lo siembra solo |
| Pasto andropogon (versión 4) | No | Solo Feedipedia |
| Mucuna | No | Sin calendario ni fenología en fuentes oficiales |
| Caupí (x'pelón) | No | Sin calendario oficial para Yucatán |

### 6.2 Calendario y fuentes por ciclo

| Ciclo | Fechas | Estado | Respaldo |
|---|---|---|---|
| Maíz (los tres planes) | 15‑jun → 5‑nov (143 d) | Siembra: `simulado_demo`. Cosecha: `verificado_fuente`. | INIFAP: siembra al inicio de las lluvias, hasta el 15‑jul (p. 54); milpa de ciclo intermedio, 140–150 dds (p. 57) |
| Canavalia | 15‑jun → 31‑mar (289 d) | `simulado_demo` en ambas fechas | USDA: siembra a fines de primavera o inicio de verano; semilla madura a 180–300 días [F09] |
| Soya Huasteca 300 | 15‑jun → 8‑oct (115 d) | Siembra: `simulado_demo`. Fin: `verificado_fuente`. | INIFAP: siembra del 15‑jun al 15‑jul (p. 79); madurez fisiológica a 115 días (pp. 77–78); cosecha al madurar la planta (p. 82) |

### 6.3 Atributos (relativos entre los tres planes)

| Plan | Fijación de N | Base | Ingreso o forraje | Base |
|---|---|---|---|---|
| `actual` | bajo | El maíz no es leguminosa; el INIFAP recomienda 59‑92‑00 (p. 55) | medio | Dos maíces: 8 434 $/ha (DGSIAP, Umán 2025) |
| `cobertura` | alto | USDA: fija 167–205 lb N/acre (~187–230 kg N/ha) y no se cosecha | bajo | Un maíz: 4 217 $/ha |
| `otro-grano` | medio | Fija nitrógeno con inoculación (INIFAP p. 78), pero se le aplica 18‑46‑00 y su grano se cosecha | alto | Soya 15 934 (Yucatán) + maíz 4 217 (Umán) = 20 151 $/ha |

> **Advertencia de ingreso** (campo `advertenciaIngreso` de `planes.json`): «El ingreso es variable e impredecible. Los valores de ingreso son de referencia (SADER/DGSIAP, 2025) y pueden no cumplirse: dependen del precio, de la lluvia y de que haya comprador. El cultivo también puede fallar.» Son valores **brutos** y no descuentan costos.

---

## 7. Resultados calculados

**Método** (propuesta para el Rol 4, que debe decidir la sección 8 del contrato v0.3):

- Opción A: la misma temporada histórica para los dos ciclos.
- Los días críticos son los de las etapas `alta`.
- `valor` = promedio anual de la proporción de días críticos que caen dentro de rachas de 5 días o más con lluvia menor que 1 mm.
- La cobertura se mide sobre los **24 meses** de los dos ciclos.
- Datos: IMERG y MERRA‑2, 1998–2025, 28 temporadas válidas.

### 7.1 Exposición por etapa (años con racha de 5 días o más que toca la etapa)

| Cultivo, siembra | Etapa (dds) | Fechas | Años |
|---|---|---|---:|
| Maíz, 15‑jun | Floración y llenado (55–94), `alta` | 9 ago–17 sep | 14/28 |
| Soya, 15‑jun | Floración y formación del grano (40–100), `alta` | 25 jul–23 sep | 18/28 |
| Canavalia, 15‑jun | Establecimiento y desarrollo (0–60), `media` | 15 jun–14 ago | — |

### 7.2 Criterios por plan

| Plan | Días críticos en racha (≥ 5 d) | Calor | Meses cubiertos de 24 |
|---|---:|---:|---:|
| `actual` | 8.6 % | 1.1 % | 10 |
| `cobertura` | 8.6 % | 1.1 % | 15 |
| `otro-grano` | 8.7 % | 1.1 % | 9 |

La soya expone más años a una racha (18 contra 14), pero la proporción de sus días críticos en racha es casi la misma que la del maíz.

### 7.3 Puntaje total

| Prioridad | 1.º | 2.º | 3.º |
|---|---|---|---|
| Agua | `otro-grano` 0.815 | `cobertura` 0.803 | `actual` 0.722 |
| Suelo | `cobertura` 0.717 | `otro-grano` 0.605 | `actual` 0.474 |
| Nitrógeno | `cobertura` 0.811 | `otro-grano` 0.636 | `actual` 0.369 |
| Ingreso | `otro-grano` 0.848 | `actual` 0.528 | `cobertura` 0.449 |

- En agua, `otro-grano` y `cobertura` quedan a 0.012 puntos, dentro de la tolerancia total de 0.02: es un empate.
- La soya cubre el suelo menos que el maíz continuo (9 frente a 10 meses). La diferencia, 0.042, cae dentro de `toleranciaEmpate.coberturaSuelo` (0.09).

### 7.4 Límites

- El indicador mide rachas secas, no el rendimiento. No ve el suelo pedregoso ni la falta de maquinaria, que el INIFAP considera necesarios para la soya. Esos riesgos están declarados en `planes.json`.
- Con el ajuste de racha en 0, el tipo de suelo ya no cambia el resultado de agua; solo cambia la aptitud.

---

## 8. Reglas (`reglas.json`)

| Campo | Valor | Estado | Respaldo |
|---|---|---|---|
| `umbralDiaSecoMm` | 1.0 (`<`) | `verificado_fuente` | Índice CDD [F06] |
| `rachaRelevanteDias` | 5 | `decision_modelo` | Contrato v0.3 |
| `umbralCalorC` / `episodioCalorRelevanteDias` | 35 °C / 3 días | `decision_modelo` | Pipeline del Rol 2 |
| Maíz | 0–19 media; 20–54 media; **55–94 alta**; 95–143 baja | `verificado_fuente` | FAO‑56 cuadro 11 (maíz grano, junio, Nigeria húmedo: 20/35/40/30); FAO TM3; INIFAP p. 57 |
| Soya Huasteca 300 | 0–39 media; **40–100 alta**; 101–115 baja | `verificado_fuente` | INIFAP pp. 77–78 (floración 40, madurez 115); FAO‑56 (soya en el trópico, etapa final de 15 días); FAO TM3 |
| Canavalia | 0–60 media; 61–300 baja | `decision_modelo` | USDA (85 % de cobertura a 60 días; semilla madura a 180–300 días); FAO TM3 |
| Suelo `leptosol` | Ajuste 0; aptitud: maíz media, canavalia alta, soya baja | Aptitud: `verificado_fuente`. Ajuste: `decision_modelo`. | INIFAP pp. 53 y 75–76; USDA |
| Suelo `luvisol` (k'ankab) | Ajuste 0; aptitud alta para los tres | Ídem | INIFAP pp. 26, 53 y 75–76; USDA |
| Cobertura, niveles, pesos y tolerancias | Valores del contrato v0.3 | `decision_modelo` | — |

**Pendientes de campo:**
- Fenología de la variedad de maíz y de Huasteca 300 en el Noroeste.
- Persistencia de la canavalia hasta marzo en suelo pedregoso.
- Disponibilidad de semilla de Huasteca 300 y si el productor puede preparar el terreno como pide el INIFAP.

**Casos de prueba para el Rol 4:**
- Cruce de año de la canavalia (06‑15 → 03‑31).
- Año bisiesto.
- Día con exactamente 1.0 mm (no es seco).
- Día `null` que corta una racha.
- Racha que empieza antes de la etapa.
- 14 frente a 15 días en un mes.
- Canavalia sin días críticos: no hay que dividir entre cero.
- Empate exacto en la tolerancia.

**Resultado esperado con el clima de Umán:** 8.6 %, 8.6 % y 8.7 %; 10, 15 y 9 meses de 24.

---

## 9. Antecedentes que se retiran o quedan fuera

- **Pasto andropogon (versión 4):** solo tenía respaldo de Feedipedia, que no es oficial.
- **Frijol negro (versión 3):** en milpa se siembra en asociación o relevo con maíz.
- **Caupí (versión 2) y mucuna:** sin calendario oficial para Yucatán.
- **Suelos tsek'el y ak'alche:** sin definición en las fuentes oficiales revisadas.
- **Resultados de Muna** (CIMMYT, Ayala et al.): no son fuentes oficiales y corresponden a la Región VII Sur.
- **Fuentes de la lista del reto que no aplican a Yucatán:** USDA (SSURGO, CDL, NAIP, QuickStats), USGS (NLCD, NWIS), PRISM, CoCoRaHS, OpenET y LANDFIRE son solo de EE. UU. NLDAS (25–53° N) no cubre Yucatán. ERA5 es de ECMWF/C3S, no de la ESA. Sentinel‑2 entra como fuente NASA a través de HLS.

---

## 10. Fuentes oficiales

Consultadas el 2026‑11‑14.

- **F01.** INIFAP (2026). *Agenda Técnica Agrícola Yucatán 2026*, código MX‑0‑310399‑52‑14‑00‑2026‑30. Frijol, pp. 24–32; maíz mecanizado, pp. 45–51; maíz milpa, pp. 52–58; soya, pp. 75–85. PDF del equipo (`14863_5727_Agenda_Técnica_Agrícola_2026_Yucatán.pdf`).
- **F02.** INEGI. *Compendio de información geográfica municipal 2010: Umán*, 31101. https://www.inegi.org.mx/contenidos/app/mexicocifras/datos_geograficos/31/31101.pdf
- **F03.** INEGI. Marco Geoestadístico, dic. 2025 (`wscatgeo`): https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/31101 · https://gaia.inegi.org.mx/wscatgeo/v2/localidades/31/101
- **F04.** FAO. *Irrigation Water Management, Training Manual 3*, cap. 2 (etapas y cuadro 2). https://www.fao.org/4/t7202e/t7202e05.htm
- **F05.** FAO. *Irrigation and Drainage Paper 56*, cap. 6, cuadro 11. https://www.fao.org/4/x0490e/x0490e0b.htm
- **F06.** Gobierno de Canadá. *Climdex indices*: CDD. https://climate-scenarios.canada.ca/?page=climdex-indices
- **F07.** NASA POWER Daily API v2.10.3 (GPM IMERG `IMERG_PRECTOT`; MERRA‑2 `T2M_MAX`, `T2M_MIN`, `GWETROOT`). https://power.larc.nasa.gov/api/temporal/daily/point?parameters=IMERG_PRECTOT,T2M_MAX,T2M_MIN,GWETROOT&community=AG&longitude=-89.787&latitude=20.834&start=19980101&end=20251231&format=JSON&time-standard=UTC
- **F08.** NASA GIBS, `HLS_S30_Nadir_BRDF_Adjusted_Reflectance`, 2025‑04‑15. https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=HLS_S30_Nadir_BRDF_Adjusted_Reflectance&CRS=EPSG:4326&BBOX=20.80,-89.81,20.86,-89.75&WIDTH=640&HEIGHT=640&FORMAT=image/jpeg&TIME=2025-04-15
- **F09.** USDA‑NRCS. *Jack Bean (Canavalia ensiformis) Plant Guide*. https://plants.usda.gov/DocumentLibrary/plantguide/pdf/pg_caen4.pdf
- **F11.** SENASICA. *Boletín de Alerta Fitosanitaria: gusano cogollero en Yucatán*, n.º 07, PV 2025. https://dj.senasica.gob.mx//Contenido/files/boletin/2025/guscog/Yucatán/julio/BoletinSAF_GC_PV_Yucatán2025_No07_11b698b2-b8dd-47a9-96ab-aeaea6d98952.pdf
- **F12.** NASA ORNL DAAC, MODIS MCD12Q1 (2023). https://modis.ornl.gov/rst/api/v1/MCD12Q1/subset?latitude=20.83&longitude=-89.78&band=LC_Type1&startDate=A2023001&endDate=A2023001&kmAboveBelow=1&kmLeftRight=1
- **F16.** SADER/DGSIAP. *Cierre de la Producción Agrícola* 2024 y 2025, nivel municipal (CSV). Portal: https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php · 2025: https://nube.agricultura.gob.mx/index.php?view=10AE434F-A2158368-A120BC5A-EDF4AFAA&ANIO=2025
- **F17.** Gobierno de Yucatán, SEPLAN. *Comisiones Regionales: Guía para la Celebración de Consultas Municipales* (2025), p. 6. https://seplan.yucatan.gob.mx//storage/Planeación/Guía_Celebración%20de%20Consultas%20Municipales_68e03d23a4b3e.pdf
- **F18.** Gobierno de Yucatán. *Programa Estatal de Ordenamiento Territorial: caracterización y diagnósticos sectoriales*. https://bitacoraordenamiento.yucatan.gob.mx/archivos/200706294825.pdf

*(F10, F13, F14 y F15 se retiraron en versiones anteriores.)*

---

## 11. Avisos para el equipo

### Rama

- Rama de tarea: **`feature/rol3-planes-reglas`**, con PR hacia **`develop`**.
- **Antes de abrir el PR:** la rama va 6 commits por detrás de `origin/develop`. Esos commits no tocan estos archivos. Hay que actualizar la rama con `develop`.

### Para el Rol 1 (decisiones)

1. **Aprobar la soya** en `otro-grano`. El id es el del contrato v0.3; el cultivo `soya` es nuevo.
2. **Aprobar los suelos WRB** (`leptosol`, `luvisol`) en lugar de `tsekel`, `kankab` y `akalche`, que no tienen fuente oficial.
3. **Definir el contrato.** Estos JSON siguen el v0.3, más los campos opcionales `trazabilidad` y `advertenciaIngreso`. Hay que revisar que el modelo entidad‑relación de `develop` pueda cargarlos.

### Para el Rol 2 (datos) — bloqueante

- `app/data/zonas.json` usa `tsekel` y `akalche` en `suelosPredominantes`, y esas claves ya no existen en `reglas.json`.
  - Para `yuc-noroeste`, el INEGI da Leptosol 56.66 % en Umán: `leptosol`.
  - Para las otras zonas hay que tomar el suelo del compendio INEGI de cada municipio.
- El clima no cambia y no hay que regenerarlo.

### Para el Rol 4 (motor)

- Hay que decidir la sección 8 del v0.3. Este informe usó la **opción A** y la **cobertura sobre 24 meses**.
- La canavalia **no tiene días críticos**. No hay que dividir entre cero.
- Resultados esperados: sección 8.

### Para el Rol 5 (captura)

- Opciones de suelo: Leptosol (pedregoso y poco profundo) y Luvisol (k'ankab, rojo y profundo). La parcela de ejemplo es `leptosol`.

### Para el Rol 6 (resultados) y el pitch

- Texto de ubicación: «Parcela de ejemplo en Umán, Región Noroeste de Yucatán. Lluvia NASA GPM IMERG 1998–2025 en una celda de ~10 km».
- Hay que mostrar `advertenciaIngreso` junto a cualquier cifra de ingreso y decir que el cultivo puede fallar.
- Hay que decir que la canavalia **no es alimento** (semilla tóxica sin tratamiento).
- Hay que decir que la soya en Umán tiene malas condiciones según el INIFAP: suelo pedregoso y menos lluvia que la zona sojera.
- Ya no hay que usar el frijol, el pasto ni las cifras de Muna.

---

## Anexo: cómo reproducir los números

1. **Clima:** descargar F07 y convertir `-999` a `null`. Las rachas son días consecutivos con `< 1.0` mm; un `null` las corta. Calor: episodios de 3 días o más con `T2M_MAX ≥ 35`.
2. **Días críticos:** en cada año de 1998 a 2025 y en cada ciclo (siembra = `Y-MM-DD`, opción A), los días de las etapas `alta`. Exposición del año = días críticos dentro de rachas de 5 días o más ÷ días críticos. `valor` = promedio de los 28 años.
3. **Cobertura:** ciclo 1 en el año Y y ciclo 2 en el año Y+1. Se cuentan los meses de los 24 que tienen 15 días o más de algún ciclo en pie.
4. **DGSIAP:** filtrar el CSV por `Idestado` 31. Umán es `Idmunicipio` 101. La soya aparece como «Soya», ciclo «Primavera-Verano», modalidad «Temporal». Valor por hectárea = `Valorproduccion` ÷ `Cosechada`.
5. **Ubicación:** prueba de punto en polígono (*ray casting*) contra la geometría de F03.
6. Los scripts (Python estándar, sin dependencias) se hicieron fuera del repositorio. Se pueden pasar a `data-pipeline/`.
