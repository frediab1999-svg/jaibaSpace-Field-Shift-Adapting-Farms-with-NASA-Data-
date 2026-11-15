# Rol 3: tres estrategias de rotación para Tekax (Sur de Yucatán)

> **Para quién:** el responsable del Rol 3 (reglas agrícolas) y su IA. La sección 11 está dirigida a todo el equipo.
> **Estado:** versión 7, para revisión en el PR hacia `develop`. Fecha de consulta de fuentes y API: **2026‑11‑15**.
> **Formato:** contrato de datos **v0.3**: tres estrategias de dos ciclos en secuencia, cinco criterios y cuatro prioridades. Se conservan los campos opcionales `trazabilidad` y `advertenciaIngreso`.
> **Archivos:** [app/data/zonas.json](../app/data/zonas.json), [app/data/planes.json](../app/data/planes.json), [app/data/reglas.json](../app/data/reglas.json) y [app/data/clima/yuc-sur.json](../app/data/clima/yuc-sur.json).
> **Regla:** todo dato agrícola viene de una **fuente oficial** y, siempre que existe, de una fuente oficial **de Yucatán** (INIFAP, INEGI, SADER/DGSIAP, SEPLAN). Se usan fuentes oficiales de fuera de Yucatán solo donde no hay una yucateca: FAO para la sensibilidad por etapa y USDA para la canavalia. Los parámetros del modelo se declaran como `decision_modelo` (sección 1.1).

---

## 0. Resumen en 10 puntos

1. **Cambio de zona:** Umán (`yuc-noroeste`) no permitía evaluar los ciclos: 100 ha de maíz a 0.77 t/ha y nada de soya. La zona pasa a **Tekax (`yuc-sur`)**, con 7 010 ha de maíz a 2.35 t/ha y 6 692 ha de soya a 2.20 t/ha (DGSIAP 2025).
2. **Punto:** San Felipe Segundo, Tekax (INEGI 310790024), en **19.8122, −89.4702**. Está en la Región VII Sur y en el Cono Sur, la zona sojera de Yucatán.
3. **Se conservan los cultivos y las tres estrategias:** `actual` (maíz → maíz), `cobertura` (canavalia → maíz) y `otro-grano` (soya Huasteca 300 → maíz). Todas son rotaciones en secuencia, sin asociación.
4. **Maíz tradicional (milpa):** variedad **Sac Beh**, sembrada a espeque. Florece desde el día 80 y se cosecha a los 150 días (INIFAP 2017 y 2026). Sustituye las etapas de FAO‑56, que eran de Nigeria.
5. **Soya:** todo su paquete viene de la Agenda INIFAP de Yucatán. Su etapa sensible abarca la floración, la formación de vainas y el llenado de grano, como indica el INIFAP. El paquete es mecanizado, así que en milpa habría que rentar la maquinaria; se declara como riesgo.
6. **Canavalia:** no hay fuente oficial de Yucatán, así que se usa la USDA. Se corta al iniciar la floración (06‑15 → 10‑30), ya no en marzo, y su aptitud por suelo queda en `null`.
7. **Suelos:** Luvisol (k'ankab, 38.67 % de Tekax) y Leptosol (22.67 %). La parcela de ejemplo es Luvisol.
8. **NASA:** NASA POWER con GPM IMERG y MERRA‑2 en el punto nuevo, 1998–2025: 10 227 días sin faltantes y una mediana de 1 130 mm al año. La imagen NASA HLS muestra parcelas alrededor del punto.
9. **Resultado:** 21.1 %, 21.1 % y 15.7 % de días críticos en racha; 10, 10 y 9 meses cubiertos de 24. `otro-grano` gana en agua e ingreso, `cobertura` gana en nitrógeno, y en suelo empatan.
10. **El ingreso es de la misma escala:** maíz y soya son de Tekax (DGSIAP 2025). La advertencia de ingreso se mantiene.

---

## 1. Cómo se clasifica cada dato

| Estado | Significado | Ejemplo |
|---|---|---|
| `verificado_fuente` | Dato respaldado por una fuente oficial identificada | Soya Huasteca 300: madurez a 115 días (INIFAP) |
| `simulado_demo` | Elección del productor ficticio dentro de un rango oficial | Siembra el 15 de junio |
| `decision_modelo` | Regla del modelo o del contrato, no dato agrícola | Pesos por prioridad; racha de 5 días |
| `pendiente_validacion_campo` | Supuesto que solo se precisa con observaciones reales | Floración de Sac Beh en Tekax |
| `calculado` | Resultado reproducible con entradas oficiales declaradas | 21.1 % de días críticos en racha |

### 1.1 Lo que queda como `decision_modelo` y por qué

| Campo | Motivo |
|---|---|
| `umbralDiaSecoMm` (1.0) | Convención de día seco del pipeline del Rol 2 (`data-pipeline/clima.py`). Se retira la referencia de Canadá. |
| `rachaRelevanteDias` (5), `umbralCalorC` (35 °C), `episodioCalorRelevanteDias` (3) | Parámetros del contrato v0.3 y del pipeline. Las fuentes oficiales revisadas no dan umbral de calor para estos cultivos. |
| `cobertura.diasMinimosPorMes`, `niveles`, `pesosPorPrioridad`, `toleranciaEmpate` | Reglas de puntuación del contrato v0.3 |
| `suelos.*.ajusteRachaDias` = 0 | No hay fuente oficial para la magnitud del ajuste |
| Etapas de la canavalia | Derivadas de la USDA. No tiene etapa `alta` porque se corta antes de formar rendimiento. |
| Nivel de `fijacionNitrogeno` de la soya | Es leguminosa inoculada, pero se fertiliza y se cosecha; por eso queda debajo de la canavalia |
| Elección de los cultivos | Decisión del equipo |

---

## 2. Ubicación: Tekax

| Dato | Valor | Estado | Fuente |
|---|---|---|---|
| Zona del MVP | `yuc-sur`, «Sur de Yucatán (Tekax)». El id ya estaba en el contrato v0.3. | `decision_modelo` | Decisión del equipo (2026‑11‑15) |
| Punto | **19.8122, −89.4702**: localidad San Felipe Segundo, clave 310790024, rural, 96 m | `verificado_fuente` | Catálogo de localidades del INEGI [F03] |
| Municipio y clave | Tekax, **31079**. El punto está dentro del polígono municipal (prueba de punto en polígono). | `verificado_fuente` | Marco Geoestadístico del INEGI, dic. 2025 [F03] |
| Región | **VII Sur** (cabecera Ticul, 20 municipios) | `verificado_fuente` | SEPLAN Yucatán, p. 6 [F17] |
| Uso agrícola | La imagen HLS del 15‑abr‑2025 muestra parcelas desmontadas alrededor del punto | `pendiente_validacion_campo` | NASA GIBS [F08] |
| Parcela de ejemplo | El mismo punto, en Luvisol (k'ankab), con milpa | `simulado_demo` | El Luvisol es el grupo de mayor superficie en Tekax [F02] |

### 2.1 Contexto oficial

| Tema | Dato | Fuente |
|---|---|---|
| Clima de Tekax | Cálido subhúmedo con lluvias en verano, de menor humedad (100 %); de 24 a 28 °C; de 1 000 a 1 100 mm | INEGI [F02] |
| Suelo de Tekax | Luvisol 38.67 %, Leptosol 22.67 %, Phaeozem 17.42 %, Vertisol 9.65 %, Nitisol 6.70 % y Cambisol | [F02] |
| Uso y potencial del suelo | Agricultura 9.83 %. Potencial: agricultura mecanizada continua 15.01 %, manual estacional 29.43 %, no apta 55.56 %. | [F02] |
| Maíz de temporal en Tekax (PV) | 7 010 ha; 2.22 t/ha en 2024 y 2.35 t/ha en 2025; 12 936 $/ha de valor bruto en 2025. Incluye parcelas mecanizadas. | DGSIAP [F16] |
| Soya de temporal en Tekax (PV) | 6 692 ha; 2.20 t/ha; 16 332 $/ha en 2025 | [F16] |
| Zona sojera | Cono Sur: Tekax, Oxkutzcab, Akil y Tzucacab, en k'ankab y yaax-hom (Luvisoles), con más de 1 100 mm al año | INIFAP 2026, pp. 75–76 [F01]; INIFAP 2017, p. 32 [F19] |
| Maíz en milpa | Siembra a espeque; predominan Leptosoles y Rendzinas; en ellos el rendimiento tradicional es de ~0.7 t/ha; Luvisoles y Cambisoles tienen mejores condiciones | [F01], p. 54 |
| Lluvia anual en el punto | Mediana de 1 130 mm (mínimo 971, máximo 1 589; IMERG 1998–2025) | `calculado` [F07] |

---

## 3. Auditoría: qué fuentes son oficiales

| Fuente | ¿Oficial? | ¿De Yucatán? | Uso en la versión 7 |
|---|---|---|---|
| INIFAP, Agendas Técnicas Agrícolas de Yucatán 2026 y 2017 | Sí | Sí | Maíz, soya, suelos y fechas |
| INIFAP, comunicado *Variedades mejoradas de maíz* (2026) | Sí | Península | Regiones donde se recomienda Sac Beh |
| INEGI: compendio de Tekax, Marco Geoestadístico y localidades | Sí | Sí | Ubicación y suelos |
| SADER/DGSIAP, cierre agrícola 2024–2025 | Sí | Sí (Tekax) | Superficie, rendimiento y valor |
| SEPLAN Yucatán | Sí | Sí | Región VII Sur |
| NASA POWER (GPM IMERG, MERRA‑2) y NASA GIBS (HLS) | Sí | Datos del punto | Clima y uso del suelo |
| FAO TM3 | Sí (ONU) | No | Qué etapa del maíz es sensible: ninguna fuente de Yucatán lo dice |
| USDA‑NRCS Plant Guide de canavalia | Sí (gobierno de EE. UU.) | No | Toda la canavalia: no hay fuente oficial yucateca |
| INEGI, compendios de Hopelchén y Felipe Carrillo Puerto | Sí | No (Campeche y Quintana Roo) | Suelos de esas zonas en `zonas.json` |
| Artículos científicos, CIMMYT, CONAHCYT sin calendario, Feedipedia, Wikipedia | No se usan | — | Se revisó si había datos de canavalia en Yucatán: solo hay artículos, que no son oficiales |

---

## 4. Cambios de la versión 7 (respecto a la v5 de `develop`)

| Tema | Decisión | Base |
|---|---|---|
| Zona | `yuc-noroeste` (Umán) → `yuc-sur` (Tekax, San Felipe Segundo) | F02, F03, F16, F17 |
| Clima | Sale `clima/yuc-noroeste.json` y entra `clima/yuc-sur.json`, generado con `data-pipeline/clima.py` | F07 |
| Maíz | De etapas FAO‑56 (Nigeria) y cosecha a 143 días, a **Sac Beh de milpa**: etapa alta del día 80 al 129 y cosecha a 150 | F19 pp. 11, 14 y 22; F01 pp. 55 y 57; F04 |
| Soya | Etapa alta de 40 a 115 (antes 40 a 100); sale la etapa final de 15 días de FAO‑56 | F01 pp. 77–79; F19 p. 33 |
| Canavalia | Se corta al iniciar la floración, 06‑15 → 10‑30 (137 días), en lugar de seguir viva hasta marzo. Aptitud por suelo en `null`. | F09 |
| Suelos | `luvisol` primero (suelo de la parcela); las aptitudes se recalculan con fuentes de Yucatán | F01, F19, F02 |
| `zonas.json` | Las tres zonas usan claves `leptosol` y `luvisol`. Se corrige el bloqueante del v5: `tsekel`, `kankab` y `akalche` no existían en `reglas.json`. | F02, F22, F23 |
| Ingreso | Maíz y soya de Tekax, a la misma escala | F16 |
| Fuentes retiradas | FAO‑56, Gobierno de Canadá, SENASICA, MODIS, Programa Estatal de Ordenamiento Territorial y todos los datos de Umán | — |

---

## 5. Clima del punto (NASA POWER: IMERG y MERRA‑2, 1998–2025)

| Mes | Lluvia (mm, mediana) | Días con Tmax ≥ 35 °C (mediana) |
|---|---:|---:|
| Ene | 21.0 | 0 |
| Feb | 10.2 | 1 |
| Mar | 26.0 | 13.5 |
| Abr | 39.7 | 23.5 |
| May | 92.1 | 23 |
| **Jun** | **164.0** | 4.5 |
| Jul | 144.0 | 0 |
| Ago | 182.8 | 0 |
| **Sep** | **205.1** | 0 |
| Oct | 129.6 | 0 |
| Nov | 50.3 | 0 |
| Dic | 25.8 | 0 |
| **Año** | **1 130** | |

- Junio es el primer mes de lluvia abundante, así que sembrar el 15‑jun cae dentro de las ventanas oficiales de maíz y soya.
- Septiembre es el mes más lluvioso, como dice el INIFAP (F01, p. 79). La soya sembrada el 15‑jun llena el grano de agosto a septiembre.
- La lluvia anual del punto (1 130 mm) supera los 1 100 mm que el INIFAP indica para la zona sojera.
- El calor de 35 °C o más se concentra de marzo a mayo, fuera de los ciclos.
- Para el Rol 2: la NASA documenta que IMERG empieza el 1‑jun‑1998, pero la API entrega datos desde enero. No afecta a ninguna etapa, porque todas empiezan después del 15‑jun.

---

## 6. Las tres estrategias

| Plan | Ciclo 1 | Ciclo 2 | Objetivo | Cosechas |
|---|---|---|---|---|
| **`actual`** (continuo) | Maíz Sac Beh, 15‑jun → 12‑nov | Maíz Sac Beh, 15‑jun → 12‑nov | Cosechar maíz en ambos ciclos | 2 de maíz |
| **`cobertura`** (rotación) | Canavalia, 15‑jun → 30‑oct (corte al florecer) | Maíz, 15‑jun → 12‑nov | Cubrir el suelo un ciclo antes de volver al maíz | 1 de maíz |
| **`otro-grano`** (rotación) | Soya Huasteca 300, 15‑jun → 8‑oct | Maíz, 15‑jun → 12‑nov | Cosechar soya y volver al maíz | 1 de soya y 1 de maíz |

### 6.1 Por qué estos cultivos

| Cultivo | Respaldo | Observación |
|---|---|---|
| Maíz Sac Beh (milpa) | INIFAP: variedad para el sistema tradicional (F01, p. 55; F19, p. 22, también en k'ankab) | El INIFAP la dirige sobre todo al poniente, noroeste y centro, y recomienda variedades mecanizadas para el sur (F21). Se declara como riesgo. |
| Soya Huasteca 300 | Paquete INIFAP completo; Tekax es la zona productora | El paquete es mecanizado (F01, pp. 76–77 y 82–83) |
| Canavalia | USDA (F09) | No hay fuente oficial de Yucatán. La semilla es tóxica y no se cosecha. |

### 6.2 Calendario y fuentes por ciclo

| Ciclo | Fechas | Estado | Respaldo |
|---|---|---|---|
| Maíz Sac Beh (los tres planes) | 15‑jun → 12‑nov (150 días) | Siembra: `simulado_demo`. Cosecha: `verificado_fuente`. | Siembra al inicio de las lluvias, hasta el 15‑jul (F01, p. 54; F19, p. 23). Cosecha: 150 días es el único valor que está en 140–150 (F01, p. 57) y en 150–160 (F19, p. 14). |
| Canavalia | 15‑jun → 30‑oct (137 días) | `simulado_demo` | Se siembra a fines de primavera o inicio de verano; florece a los 4–5 meses y como cobertura se corta al empezar a florecer (F09). 137 días es el punto medio. |
| Soya Huasteca 300 | 15‑jun → 8‑oct (115 días) | Siembra: `simulado_demo`. Fin: `verificado_fuente`. | Siembra del 15‑jun al 15‑jul (F01, p. 79); madurez fisiológica a 115 días (F01, pp. 77–78) |

### 6.3 Atributos (relativos entre los tres planes)

| Plan | Fijación de N | Base | Ingreso o forraje | Base (DGSIAP 2025, Tekax) |
|---|---|---|---|---|
| `actual` | bajo | El maíz no es leguminosa; 59‑92‑00 en milpa (F01, p. 55) | medio | 2 × 12 936 = 25 871 $/ha |
| `cobertura` | alto | 167–205 lb N/acre (~187–230 kg N/ha) y no se cosecha (F09) | bajo | 12 936 $/ha |
| `otro-grano` | medio | Fija N con inoculación (F01, pp. 78–79), pero se le aplica 18‑46‑00 y su grano se cosecha | alto | 16 332 + 12 936 = 29 268 $/ha |

Con el cierre 2024 el orden de ingresos es el mismo. Son valores **brutos** y no descuentan costos. El campo `advertenciaIngreso` de `planes.json` dice que pueden no cumplirse y que el cultivo puede fallar.

---

## 7. Resultados calculados

**Método:** el mismo de las versiones anteriores, como propuesta para el Rol 4.

- Opción A: la misma temporada histórica para los dos ciclos.
- Días críticos: los de las etapas `alta`.
- `valor`: promedio anual de la proporción de días críticos que caen dentro de rachas de 5 días o más con menos de 1 mm de lluvia.
- Cobertura: sobre los 24 meses de los dos ciclos.
- Datos: `clima/yuc-sur.json`, con 28 temporadas completas.

### 7.1 Exposición por etapa (años con una racha de 5 días o más que toca la etapa)

| Cultivo, siembra | Etapa (días) | Fechas | Años |
|---|---|---|---:|
| Maíz Sac Beh, 15‑jun | Floración y llenado (80–129), `alta` | 3‑sep a 22‑oct | 25/28 |
| Soya, 15‑jun | Floración, vainas y llenado (40–115), `alta` | 25‑jul a 8‑oct | 24/28 |
| Canavalia, 15‑jun | Establecimiento (0–60), `media` | 15‑jun a 14‑ago | — |

### 7.2 Criterios por plan

| Plan | Días críticos en racha (≥ 5 d) | Calor | Meses cubiertos de 24 | Años con exposición |
|---|---:|---:|---:|---:|
| `actual` | 21.1 % | 0.6 % | 10 | 25/28 |
| `cobertura` | 21.1 % | 0.6 % | 10 | 25/28 |
| `otro-grano` | 15.7 % | 1.8 % | 9 | 27/28 |

### 7.3 Puntaje total

| Prioridad | 1.º | 2.º | 3.º |
|---|---|---|---|
| Agua | `otro-grano` 0.782 | `cobertura` 0.717 | `actual` 0.667 |
| Suelo | `cobertura` 0.605 ≈ `otro-grano` 0.593 (empate) | | `actual` 0.455 |
| Nitrógeno | `cobertura` 0.751 | `otro-grano` 0.625 | `actual` 0.351 |
| Ingreso | `otro-grano` 0.837 | `actual` 0.509 | `cobertura` 0.409 |

- En suelo, `cobertura` y `otro-grano` quedan a 0.012, dentro de la tolerancia total de 0.02.
- La canavalia ya no gana en meses cubiertos: cortada al florecer, ocupa los mismos meses que el maíz. Su ventaja es el nitrógeno.
- El maíz de milpa florece en septiembre y octubre, más tarde que un maíz mecanizado, por eso su exposición (21.1 %) es mayor que la de la soya (15.7 %).

### 7.4 Límites

- El indicador mide rachas secas, no el rendimiento. No ve la falta de maquinaria para la soya ni la humedad del suelo.
- Con el ajuste de racha en 0, el tipo de suelo no cambia el resultado de agua; solo cambia la aptitud.
- El promedio de rendimiento de Tekax mezcla milpa y parcelas mecanizadas.

---

## 8. Reglas (`reglas.json`)

| Campo | Valor | Estado | Respaldo |
|---|---|---|---|
| `umbralDiaSecoMm` | 1.0 (`<`) | `decision_modelo` | Pipeline del Rol 2 |
| `rachaRelevanteDias` | 5 | `decision_modelo` | Contrato v0.3 |
| `umbralCalorC` / `episodioCalorRelevanteDias` | 35 °C / 3 días | `decision_modelo` | Pipeline del Rol 2 |
| Maíz Sac Beh | 0–79 media; **80–129 alta**; 130–150 baja | `verificado_fuente` | F19 p. 11 (floración 80–85); F01 p. 57 (madurez 45–50 días después); F04 (sensibilidad) |
| Soya Huasteca 300 | 0–39 media; **40–115 alta** | `verificado_fuente` | F01 pp. 77–79; F19 p. 33; F04 |
| Canavalia | 0–60 media; 61–137 baja | `decision_modelo` | F09; F04 |
| Suelo `luvisol` (k'ankab y yaax-hom) | Ajuste 0; aptitud: maíz alta, soya alta, canavalia `null` | Aptitud: `verificado_fuente`. Ajuste: `decision_modelo`. | F01 pp. 54 y 75–76; F19 p. 20 |
| Suelo `leptosol` | Ajuste 0; aptitud: maíz media, soya baja, canavalia `null` | Ídem | F01 pp. 54 y 75–76 |
| Cobertura, niveles, pesos y tolerancias | Valores del contrato v0.3, sin cambio | `decision_modelo` | — |

**Pendientes de campo:**
- Días a floración y a cosecha de Sac Beh en Tekax. La Agenda 2017 se contradice: la p. 22 da 120 días de siembra a cosecha para las variedades de milpa en k'ankab, pero la p. 11 pone la floración a los 80–85 días.
- Fecha real de floración de la canavalia en Tekax y cuánto dura la cubierta que deja.
- Si el productor puede rentar la preparación mecanizada y la trilla para la soya, y si hay semilla de Huasteca 300.

**Casos de prueba para el Rol 4:**
- Ningún ciclo cruza de año, pero conviene conservar la prueba de cruce de año.
- Año bisiesto.
- Día con exactamente 1.0 mm (no es seco).
- Día `null` que corta una racha.
- Racha que empieza antes de la etapa.
- 14 frente a 15 días en un mes.
- Canavalia sin días críticos: no hay que dividir entre cero.
- `aptitud` con valor `null`: la interfaz muestra «sin dato».
- Empate exacto en la tolerancia.

**Resultado esperado con el clima de Tekax:** 21.1 %, 21.1 % y 15.7 %; 10, 10 y 9 meses de 24.

---

## 9. Antecedentes que se retiran o quedan fuera

- **Umán:** sin soya y con poco maíz, no permitía evaluar los ciclos. Se retiran su zona, su clima y sus cifras.
- **Etapas FAO‑56 del maíz:** eran de Nigeria y ponían la floración hacia el día 55. Las sustituye la fenología oficial de Sac Beh.
- **Canavalia hasta marzo:** contradecía a su propia fuente, que indica cortarla al empezar a florecer.
- **Maíz mecanizado (VS‑536):** se evaluó, pero el equipo eligió el maíz tradicional.
- **Frijol y sorgo** como reemplazo de la canavalia: con ellos, `cobertura` perdía las cuatro prioridades, y el DGSIAP no registra frijol en Tekax.
- **Suelos tsek'el y ak'alche:** sin definición en las fuentes oficiales revisadas.
- **Fuentes de la lista del reto que no aplican a Yucatán:** USDA (SSURGO, CDL, NAIP, QuickStats), USGS (NLCD, NWIS), PRISM, CoCoRaHS, OpenET y LANDFIRE son solo de EE. UU. NLDAS (25–53° N) no cubre Yucatán.

---

## 10. Fuentes oficiales

Consultadas el 2026‑11‑15. Las páginas son las impresas en cada documento.

- **F01.** INIFAP (2026). *Agenda Técnica Agrícola Yucatán 2026*, código MX‑0‑310399‑52‑14‑00‑2026‑30. Frijol, pp. 24–32; maíz mecanizado, pp. 45–51; maíz milpa, pp. 52–58; soya, pp. 75–85. https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_agendas/14863_5727_Agenda_T%C3%A9cnica_Agr%C3%ADcola_2026_Yucat%C3%A1n.pdf
- **F02.** INEGI. *Compendio de información geográfica municipal 2010: Tekax*, 31079. https://www.inegi.org.mx/contenidos/app/mexicocifras/datos_geograficos/31/31079.pdf
- **F03.** INEGI. Marco Geoestadístico, dic. 2025, y catálogo de localidades (`wscatgeo`): https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/31079 · https://gaia.inegi.org.mx/wscatgeo/v2/localidades/31/079
- **F04.** FAO. *Irrigation Water Management, Training Manual 3*, cap. 2 (etapas y cuadro 2). https://www.fao.org/4/t7202e/t7202e05.htm
- **F07.** NASA POWER Daily API v2.10.3 (GPM IMERG `IMERG_PRECTOT`; MERRA‑2 `T2M_MAX`). https://power.larc.nasa.gov/api/temporal/daily/point?parameters=IMERG_PRECTOT,T2M_MAX&community=AG&longitude=-89.4702&latitude=19.8122&start=19980101&end=20251231&format=JSON&time-standard=UTC
- **F08.** NASA GIBS, `HLS_S30_Nadir_BRDF_Adjusted_Reflectance`, 2025‑04‑15. https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=HLS_S30_Nadir_BRDF_Adjusted_Reflectance&CRS=EPSG:4326&BBOX=19.7822,-89.5002,19.8422,-89.4402&WIDTH=512&HEIGHT=512&FORMAT=image/jpeg&TIME=2025-04-15
- **F09.** USDA‑NRCS. *Jack Bean (Canavalia ensiformis) Plant Guide* (publicada en marzo de 2013). https://plants.usda.gov/DocumentLibrary/plantguide/pdf/pg_caen4.pdf
- **F16.** SADER/DGSIAP. *Cierre de la Producción Agrícola* 2024 y 2025, nivel municipal (CSV). Portal: https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php · 2025: https://nube.agricultura.gob.mx/index.php?view=10AE434F-A2158368-A120BC5A-EDF4AFAA&ANIO=2025
- **F17.** Gobierno de Yucatán, SEPLAN. *Comisiones Regionales: Guía para la Celebración de Consultas Municipales* (2025), p. 6. https://seplan.yucatan.gob.mx//storage/Planeación/Guía_Celebración%20de%20Consultas%20Municipales_68e03d23a4b3e.pdf
- **F19.** INIFAP (2017). *Agenda Técnica Agrícola Yucatán*. Milpa roza, pp. 10–14; milpa caña, pp. 15–19; maíz en chac-lu'um y k'ankab, pp. 20–27; maíz mecanizado, pp. 28–31; soya, pp. 32–38. https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_agendas/4148_4845_Agenda_Tecnica_Yucatan_2017.pdf
- **F21.** INIFAP (18‑jun‑2026). *Variedades mejoradas de maíz*, comunicado. https://www.gob.mx/inifap/prensa/variedades-mejoradas-de-maiz?idiom=es
- **F22.** INEGI. *Compendio de información geográfica municipal 2010: Hopelchén*, 04006. https://www.inegi.org.mx/contenidos/app/mexicocifras/datos_geograficos/04/04006.pdf
- **F23.** INEGI. *Compendio de información geográfica municipal 2010: Felipe Carrillo Puerto*, 23002. https://www.inegi.org.mx/contenidos/app/mexicocifras/datos_geograficos/23/23002.pdf

*(F05, F06, F10–F15, F18 y F20 se retiraron en esta versión o en versiones anteriores.)*

---

## 11. Avisos para el equipo

### Rama

- Rama de tarea: **`refactor/rol3-tekax-planes-reglas`**, con PR hacia **`develop`**. Está al día con `origin/develop`.

### Para el Rol 1 (decisiones)

1. **Aprobar la zona** `yuc-sur` (Tekax) en lugar de `yuc-noroeste` (Umán).
2. **Aprobar las dos fuentes no yucatecas:** USDA para la canavalia y FAO TM3 para la sensibilidad del maíz.
3. **Tener en cuenta la tensión del plan con soya:** el maíz es de milpa, pero el paquete de la soya es mecanizado.

### Para el Rol 2 (datos)

- `clima/yuc-sur.json` se generó con `data-pipeline/clima.py` sin cambios en el script. `clima/yuc-noroeste.json` se borró porque ya ninguna zona lo usa.
- Si se vuelve a correr `clima.py`, también se regeneran `camp-chenes.json` y `qroo-centro.json`, con fecha de descarga nueva.
- `docs/entrega-datos-mvp.md` todavía describe Umán y `yuc-noroeste.json`. Hay que actualizarlo.
- Revisar `primerDatoValido: 1998-01-01` frente al inicio documentado de IMERG (1998‑06‑01).

### Para el Rol 4 (motor)

- Hay que decidir la sección 8 del contrato v0.3. Este informe usó la **opción A** y la **cobertura sobre 24 meses**.
- La canavalia **no tiene días críticos**. No hay que dividir entre cero.
- `aptitud` puede ser `null`.
- Los tests de `server/` usan el texto `"yuc-noroeste"` como ejemplo; no se rompen, pero conviene cambiarlo a `"yuc-sur"`.
- Resultados esperados: sección 8.

### Para el Rol 5 (captura)

- Opciones de suelo: Luvisol (k'ankab o yaax-hom, rojo y profundo) y Leptosol (pedregoso y poco profundo). La parcela de ejemplo es `luvisol`.

### Para el Rol 6 (resultados) y el pitch

- Texto de ubicación: «Parcela de ejemplo en Tekax, Sur de Yucatán (Cono Sur). Lluvia NASA GPM IMERG 1998–2025 en una celda de ~10 km».
- Hay que mostrar `advertenciaIngreso` junto a cualquier cifra de ingreso y decir que el cultivo puede fallar.
- Hay que decir que la canavalia **no es alimento** (semilla tóxica sin tratamiento) y que sus datos vienen de la USDA.
- Hay que decir que la soya necesita preparación del terreno y trilla con maquinaria.
- Ya no hay que usar las cifras de Umán.

---

## Anexo: cómo reproducir los números

1. **Clima:** `python data-pipeline/clima.py app/data` descarga F07 y escribe `clima/<zona>.json`, con `-999` convertido a `null`. Las rachas son días consecutivos con menos de 1.0 mm; un `null` las corta. El calor se mide en episodios de 3 días o más con `T2M_MAX ≥ 35`.
2. **Días críticos:** para cada año de 1998 a 2025 y cada ciclo (siembra = `Y-MM-DD`, opción A), se toman los días de las etapas `alta`. Exposición del año = días críticos dentro de rachas de 5 días o más ÷ días críticos. `valor` = promedio de los 28 años.
3. **Cobertura:** ciclo 1 en el año Y y ciclo 2 en el año Y+1. Se cuentan los meses de los 24 que tienen 15 días o más con algún ciclo en pie.
4. **DGSIAP:** filtrar el CSV por `Idestado` 31 e `Idmunicipio` 79 (Tekax), ciclo «Primavera-Verano», modalidad «Temporal» (2). Valor por hectárea = `Valorproduccion` ÷ `Cosechada`.
5. **Ubicación:** prueba de punto en polígono (*ray casting*) contra la geometría de F03.
6. Los scripts de cálculo (Python estándar, sin dependencias) se hicieron fuera del repositorio. Comprueban que cada ciclo dure lo mismo que sus etapas, y se pueden pasar a `data-pipeline/`.
