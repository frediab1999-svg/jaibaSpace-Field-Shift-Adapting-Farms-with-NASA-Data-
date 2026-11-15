# jaibaSpace · Datos para el MVP en la Península de Yucatán

**Corte de la revisión:** 14 de noviembre de 2026. **Formato:** documento de contexto para otra IA y para el equipo. Incluye resultados calculados, fuentes originales y reglas para reproducirlos. Este documento amplía el alcance previo, que solo utilizaba el punto cercano a Muna y proponía dos planes.

## 0. Guía de integración para el equipo

**Usen esta sección como punto de partida para el backend.** Las secciones 2 a 7 conservan el análisis original de localidades y las fuentes. El paquete complementario `jaibaSpace-datos-backend.zip` contiene datos importables preparados para este alcance. Los puntos de esta sección se seleccionaron fuera de polígonos clasificados como urbanos en la cartografía de suelos. Los de la sección 2 son referencias originales y conservan sus propias cifras.

### 0.1. Archivos que puede consumir el backend

| Archivo | Granularidad y contenido | Relación |
|---|---|---|
| `sitios-y-climatologia.json` | 11 puntos de demostración en las 7 zonas. Incluye coordenadas, municipio, suelo cartografiado, URL por variable, estadística mensual 2001–2025 y resumen junio–agosto por año. | `siteId` hacia clima. `cvegeo` hacia DGSIAP. |
| `clima-diario.csv` | **100 441 registros**. Precipitación diaria estimada, temperatura máxima y mínima, del 1 de enero de 2001 al 31 de diciembre de 2025, en UTC. Sin faltantes. | PK compuesta `site_id, date_utc`. Leer como números decimales. |
| `maiz-temporal-municipal.csv` | **243 registros municipio-año**. Maíz de grano, temporal, primavera–verano, 2003–2025 según disponibilidad. Superficie sembrada, cosechada y siniestrada, producción y rendimiento. | PK compuesta `municipality_code, year`. Importar la clave como texto de cinco caracteres, incluido el cero inicial de Campeche. Rendimiento vacío equivale a `null`. |
| `cultivos-y-planes.json` | Perfiles de maíz de grano, canavalia y x’pelón, tres planes de demostración y referencias de calendario con su contexto. | `cropId` desde el plan. Las fechas efectivas y etapas sensibles son datos de parcela y ciclo. |
| `fuentes.json` | URLs oficiales de las fuentes base. | Identificadores `sourceIds` en la ficha del sitio. En el catálogo agrícola hay enlaces por evidencia. |

### 0.2. Cómo se unen NASA, INEGI, INIFAP y DGSIAP

1. **Ubicación.** Recibir latitud/longitud de la parcela, o un `siteId` de demostración. Con GPS, intersectar el punto con un municipio del **Marco Geoestadístico de INEGI** y obtener `cvegeo`. Las zonas del contrato son agrupaciones del proyecto, por lo que hay que guardar su correspondencia con municipios. Preservar fronteras y versiones del marco. GeoJSON usa orden **longitud, latitud**. [Documentación del Marco Geoestadístico](https://www.inegi.org.mx/servicios/catalogounico/) · [Ejemplo GeoJSON de Umán](https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/31101)
2. **Suelo.** Con las mismas coordenadas, consultar el polígono de Edafología Serie III. Guardar `OBJECTID`, `Clave_wrb`, `Grupo1`, `Clase_tex`, `Lmte_sup`, `Fase_fis_u` y `Fase_qui_u` con la versión del producto. `Clase_tex`: 1 gruesa, 2 media, 3 fina en la unidad cartografiada. `Lmte_sup` admite P pedregosa, G gravosa y N ninguna registrada. `N/A` significa que el atributo no aplica en el diccionario. Una parcela puede intersectar más de una unidad. Si se tiene el polígono, conservar las superficies de intersección. Si solo se tiene un punto, devolver el contexto en ese punto. Guardar **tsek’el, k’ankab y ak’alche** como observación del productor o dato de campo separado del código WRB. [Edafología Serie III y diccionario](https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=794551118313)
3. **Clima.** Consultar **IMERG_PRECTOT** y **T2M_MAX/T2M_MIN** para el mismo punto. IMERG aporta lluvia a **0.1°** y la temperatura del período consultado proviene de MERRA-2 vía POWER, a **0.5° × 0.625°**. Aunque aparezcan juntas en el CSV, conservan resoluciones y fuentes diferentes. Unir por sitio y día UTC. Si se selecciona un sitio aproximado, identificarlo como referencia. [Metodología de NASA POWER](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/)
4. **Calendario.** Vincular cultivo, variedad y sistema productivo con la fecha de siembra y la ventana que se quiere evaluar. INIFAP aporta rangos de referencia para escenarios documentados. Capturar `plantDate`, `stageStart`, `stageEnd`, `stageSource` y la condición `producer_reported`, `reference`, `demo_assumption` o `pending`. Para cobertura, guardar también fecha de establecimiento y de terminación si se conocen. [Calendario agrícola DGSIAP](https://nube.agricultura.gob.mx/calendario_agricola/)
5. **Producción.** Unir DGSIAP por `cvegeo + year` con el filtro fijo de temporal, maíz grano y primavera–verano de este paquete. El resultado representa el municipio completo. El historial de una parcela, su cultivo previo y sus cosechas requieren registros propios. Para un estudio municipal, agregar clima espacialmente con una máscara o un muestreo que represente las áreas cultivadas. La coordenada de demostración sirve para explorar, y una fila de DGSIAP no identifica la respuesta al clima de esa coordenada. [Cierre agrícola DGSIAP](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php)

### 0.3. Puntos de prueba con clima y suelo en las mismas coordenadas

Seleccioné puntos a aproximadamente 4 km de las referencias originales. Cada uno cae dentro del municipio comprobado con GeoJSON de INEGI y una sola unidad edafológica con textura válida, con grupo dominante distinto de Technosol. **Son escenarios de demostración**. Quedan por verificar el uso agrícola del terreno y el tipo de suelo maya en campo. Volví a consultar NASA en cada coordenada. Es importante conservar esta distinción porque **7 de 11 series de lluvia cambiaron** respecto al punto previo. En Umán la frecuencia del indicador pasó de 3 a 4 de 25 y en Felipe Carrillo Puerto de 16 a 14 de 25.

| Zona | Punto de demostración (latitud, longitud) | Suelo dominante cartografiado | Textura | Lluvia jun–ago promedio (mm) | Temporadas con racha ≥10 días de 25 |
|---|---|---|---|---:|---:|
| noroeste-yuc | Umán (20.91791, -89.75000) | Leptosol | Media | 498.5 | 4 |
| oriente-yuc | Valladolid (20.72597, -88.20417) | Leptosol | Media | 582.1 | 8 |
| oriente-yuc | Tizimín (21.19208, -88.16861) | Phaeozem | Fina | 577.3 | 4 |
| sur-puuc-yuc | Tekax (20.24097, -89.29111) | Leptosol | Media | 554.7 | 3 |
| sur-puuc-yuc | Oxkutzcab (20.31654, -89.36758) | Nitisol | Fina | 556.5 | 5 |
| los-chenes-camp | Hopelchén (19.78197, -89.84400) | Vertisol | Fina | 547.5 | 5 |
| sur-camp | Escárcega (18.64397, -90.74500) | Leptosol | Media | 777.6 | 1 |
| sur-camp | Candelaria (18.22197, -91.04700) | Phaeozem | Media | 766.2 | 1 |
| zona-maya-qroo | Felipe Carrillo Puerto (19.61297, -88.04500) | Luvisol | Media | 468.8 | 14 |
| sur-qroo | Bacalar (18.71397, -88.39200) | Vertisol | Fina | 494.5 | 13 |
| sur-puuc-yuc | Muna (20.52597, -89.75000) | Cambisol | Media | 540.5 | 2 |

El promedio y el conteo corresponden a **junio–agosto de 2001–2025**, con día seco **<1 mm** y racha de **≥10 días** para el conteo. El paquete también incluye los 12 meses. La climatología mensual de lluvia es el promedio de 25 acumulados mensuales. Las temperaturas mensuales máxima y mínima son los promedios de los extremos **diarios**, ponderados por número de días. Como contexto local, el promedio jun–ago de máximas y mínimas diarias es **32.0 / 25.2 °C** en Umán, **32.1 / 24.0 °C** en Hopelchén y **30.7 / 24.8 °C** en Felipe Carrillo Puerto, para estos puntos. La temperatura queda disponible como variable de contexto mientras se definen reglas agronómicas y se valida con estaciones.

**Verificación de clima en México.** SMN/CONAGUA aporta estaciones de precipitación y temperatura. CICESE permite consultar y descargar datos históricos del CLICOM y documenta acumulados de 24 h con cierre a las **08:00 hora local** para esa base. Comparar primero períodos de observación compatibles y documentar el período disponible de cada estación. Para comparar rachas diarias con precisión, agregar IMERG subdiario al intervalo de observación cuando haga falta. El cotejo de observaciones de estación queda pendiente. [SMN, estaciones](https://wwwsmn.conagua.gob.mx/es/climatologia/informacion-climatologica/informacion-estadistica-climatologica) · [CICESE, estaciones y metodología](https://cucapa-clicom.cicese.mx/) · [IMERG subdiario](https://gpm.nasa.gov/data/imerg)

### 0.4. Datos de cultivo útiles para reglas del backend

| Cultivo | Datos que sí pueden guardar como evidencia | Campos pendientes en parcela |
|---|---|---|
| **Maíz de grano** | La guía de Campeche da **54, 55 y 59 días** a floración para V-537C, V-556AC y VS-536 en el contexto que describe. Yucatán distingue sistema y suelo. Quintana Roo distingue milpa tradicional, temporal mecanizable y riego. | Variedad, fecha real de siembra, fecha observada o estimada de floración, amplitud documentada de la ventana sensible. Un día de floración registrado en una guía es un ancla y la ventana de análisis requiere su propia evidencia. |
| **Canavalia** | El ensayo del Campo Experimental Uxmal de INIFAP, en Muna, estudió Cambisol crómico, asociación y descanso de uno o dos años, con y sin fósforo. Las leguminosas del protocolo se sembraron el **13-08-1998** y **30-07-1999**. Una tesis de Chapingo en Calakmul aporta contexto adicional sobre cobertura. | Material, fecha de establecimiento, permanencia, manejo y compatibilidad con el siguiente maíz. Los tratamientos del ensayo son registros de evidencia y necesitan condiciones comparables para extrapolar. |
| **X’pelón** | Un ensayo en Yucatán probó 65 variedades y reportó extremos de floración de **33 días** (INIFAT 93) y **135 días** (UCR3703). Algunas variedades también se evaluaron en asociación con maíz. DGSIAP confirma presencia local en municipios identificados en la sección 3. | Variedad o semilla que podrá conseguir el productor, fecha de siembra, etapa sensible, cosecha prevista y confirmación local de la secuencia x’pelón → maíz. Las cifras de 33 y 135 días corresponden a materiales distintos. |

Fuentes: [INIFAP Campeche, capítulo Maíz de temporal](https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_agendas/3084_4789_Agenda_Tecnol%C3%B3gica_Campeche_2015.pdf) · [INIFAP, ensayo del Campo Experimental Uxmal](https://www.scielo.org.mx/pdf/tl/v27n1/v27n1a8.pdf) · [Chapingo, Calakmul](https://repositorio.chapingo.edu.mx/items/4e6f9aec-fa39-41d3-b152-7e2c93e1310c) · [Ensayo de variedades de espelón en Yucatán](https://agrotecnia.edicionescervantes.com/index.php/agrotecnia/article/view/813) · [DGSIAP, datos municipales](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php)

### 0.5. Entradas, salidas y casos de prueba para frontend y backend

**Rutas propuestas para adaptar al repositorio.**

| Acción | Entrada | Respuesta que usa frontend |
|---|---|---|
| `GET /zonas` | Opcional, filtro por estado. | Zonas, municipio, sitios de referencia y estado habilitado para el MVP. |
| `GET /sitios/{siteId}/contexto` | ID del sitio. | Contexto de suelo y clima, coordenadas, referencias, dato municipal y campos por confirmar. |
| `POST /comparaciones` | Sitio o GPS, tres planes para la misma parcela, fechas o ventanas por ciclo, período, umbral y longitud de racha. | Resultado por plan y ciclo, temporadas válidas, coincidencias, peor racha, fuente y estado si falta un dato. Las fechas de ciclo de la parcela son distintas de los años históricos de simulación. |

**Caso reproducible para integración.** En el punto `hopelchen-demo`, al simular una ventana ilustrativa del **10 al 20 de junio** en cada año, con racha de **10 días o más**, umbral **<1 mm** y detección dentro de junio–agosto, se encuentran **3 de 25 temporadas** con coincidencias. En **2004** se solapan 2 días, en **2014** 4 días y en **2025** 7 días. La racha del 5 al 16 de junio de 2025 dura 12 días. La ventana 10–20 de junio es de prueba y queda marcada como supuesto. Su estado en el contrato es `demo_assumption`.

```json
{
  "siteId": "hopelchen-demo",
  "municipalityCode": "04006",
  "metric": "historical_dry_spell_overlap",
  "rainThresholdMm": 1,
  "minConsecutiveDays": 10,
  "minOverlapDays": 1,
  "years": [2001, 2025],
  "calendar": {"startMonthDay": "06-10", "endMonthDay": "06-20", "status": "demo_assumption"},
  "eligibleSeasons": 25,
  "affectedSeasons": 3,
  "affectedByYear": [{"year": 2004, "days": 2}, {"year": 2014, "days": 4}, {"year": 2025, "days": 7}],
  "soil": {"mappedGroup": "VR", "texture": "fine", "mayaSoil": null},
  "sourceIds": ["nasa-imerg", "inegi-soils", "inegi-geo"]
}
```

**Casos de prueba propuestos.** Fecha ausente o inválida → `status: "calendar_pending"` para ese ciclo, métricas `null`. Días sin observación → excluir temporadas cuya ventana de análisis no se puede evaluar según la regla de calidad. Un empate entre planes con el mismo cultivo y fechas → informar la misma exposición a rachas. Rangos que cruzan año → construir fechas completas, verificar ambos años y evitar extender a 2026 una serie terminada en 2025. Un año sin fila agrícola en Bacalar → conservar ausente. Clave municipal inválida o punto fuera del catálogo → pedir ubicación válida o devolver cobertura pendiente.

**Texto de pantalla para el ejemplo.** «Entre 2001 y 2025, una racha seca habría coincidido con estas fechas en 3 temporadas. En 2025 coincidieron 7 días». El detalle puede mostrar «Datos satelitales de la zona» y «Fechas de ejemplo». Para explorar si un suelo somero o encharcable cambia el impacto de una racha, hace falta formular y validar una regla agronómica o un balance hídrico. [FAO, insumos AquaCrop](https://www.fao.org/aquacrop/overview/input-requirements/es)

---


## 1. Qué estamos construyendo

jaibaSpace participa en **Field Shift: Adapting Farms with NASA Data**. Es una app móvil en español para productores de temporal en **Yucatán, Campeche y Quintana Roo, México**. El cultivo base es **maíz de grano de temporal**. El objetivo es que el productor pueda comparar opciones para su parcela según la lluvia histórica, el tipo de suelo, el calendario y lo que quiere priorizar. Una formulación para la pantalla es «¿Con qué frecuencia una racha seca habría coincidido con esta etapa de mi cultivo?».

El contrato define **siete zonas** y un mínimo de **una zona por estado**: Noroeste de Yucatán, Los Chenes de Campeche y Zona maya de Quintana Roo. *Field Shift* sugiere comparar al menos tres estrategias, incluida la actual. Usar dos ciclos por estrategia es una decisión del proyecto. El Día 1 puede funcionar con datos ya descargados y una ventana de cultivo ingresada manualmente. [Enunciado oficial](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/) · [Copia de Details → Objectives, sede de Athlone](https://hackathlone.com/challenges/adapting-farms-with-nasa-data)

| Plan ilustrativo | Ciclo 1 | Ciclo 2 | Qué debe explicar la app |
|---|---|---|---|
| A. Plan actual de ejemplo | Maíz de grano | Maíz de grano | Conserva el maíz en los dos ciclos del ejemplo. En una parcela real, este plan refleja lo que declara el productor, sea maíz continuo, milpa, descanso u otra secuencia. |
| B. Cobertura | Canavalia (*Canavalia ensiformis*) | Maíz de grano | Dedica un ciclo a cobertura. Mostrar siembra y manejo cuando estén respaldados y que ese primer ciclo se dedica a cobertura en vez de cosecha de maíz. |
| C. Diversificar la cosecha | Frijol x’pelón o caupí (*Vigna unguiculata*) | Maíz de grano | Explora cosechar otro grano antes de volver al maíz. Su disponibilidad y calendario se confirman localmente. |

Un ciclo del plan y un año del historial son entidades distintas. Dos ciclos pueden corresponder a dos temporadas de temporal consecutivas en años agrícolas distintos. El equipo debe establecer las fechas. Maíz, frijol y calabaza sembrados juntos constituyen una asociación en el mismo ciclo. [Agricultura Yucatán, contexto de la milpa](https://www.gob.mx/agricultura/yucatan/articulos/dia-nacional-del-maiz-identidad-cultura-y-sustento-de-mexico-29-de-septiembre)

## 2. Datos climáticos depurados y resolución territorial

Descargué **11 series** de GPM IMERG mediante NASA POWER. Cada una devolvió **9 131 fechas diarias consecutivas**, del **2001-01-01 al 2025-12-31**, incluidas fechas bisiestas, con **0 faltantes** tras cotejar todas las claves del calendario y **0 valores negativos**. Total: **100 441 pares punto-fecha**. La respuesta identificó IMERG y UTC. La precipitación es el acumulado diario para una celda de **0.1° (aprox. 10 km)**. Un punto es una referencia local de la celda, y las estadísticas agrícolas de la sección siguiente representan municipios completos. [NASA POWER, documentación de IMERG](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/#imerg-integrated-multi-satellite-retrievals-for-gpm) · [NASA GPM/IMERG](https://gpm.nasa.gov/data/imerg)

**Corrección geográfica.** El punto **20.49, −89.75** de la demo anterior queda cerca de **Muna**, en el sur de Yucatán, región Puuc. Conservar sus valores con la etiqueta Muna. Para el **Noroeste** y el mínimo contractual, **Umán** es el punto de referencia propuesto y verificado por separado. Las zonas son agrupaciones del producto. Sus límites deben quedar definidos por municipio o polígonos explícitos antes de asignar automáticamente una parcela por GPS. [Gobierno de Yucatán, Muna](https://yucatan.gob.mx/estado/ver_municipio.php?id=53) · [Gobierno de Yucatán, Umán](https://www.yucatan.gob.mx/estado/ver_municipio.php?id=101) · [Junta Intermunicipal Biocultural del Puuc](https://jibiopuuc.org.mx/muna/) · [INEGI, claves geoestadísticas](https://www.inegi.org.mx/servicios/catalogounico/)

### Resultados por punto

Se evaluó **1 de junio a 31 de agosto** en cada año de 2001 a 2025. En la columna «Temporadas», cada número cuenta años con al menos una racha de **10 o más días consecutivos**. Los tres conteos usan umbrales de lluvia **estrictamente menores que 0.5 / 1 / 2 mm diarios**, respectivamente. El umbral central de **1 mm** y la duración de **10 días** son parámetros de demostración. Las fechas y duraciones de 2025 usan 1 mm. Una racha se recorta al límite de esta ventana en esta tabla. Si hay empate de duración, se muestra la primera.

| Estado | Zona | Punto (latitud, longitud) | Temporadas de 25: <0.5 / <1 / <2 mm | Lluvia jun–ago 2025 (mm) | Racha máxima jun–ago 2025 |
|---|---|---|---:|---:|---|
| Yucatán | Noroeste | **Umán** (20.83400, -89.78700) | 2 / 3 / 8 | 438.14 | 9 días (19–27 ago) |
| Yucatán | Oriente | Valladolid (20.69000, -88.20417) | 7 / 9 / 12 | 633.14 | 9 días (05–13 jun) |
| Yucatán | Oriente | Tizimín (21.15611, -88.16861) | 2 / 4 / 10 | 577.81 | 7 días (19–25 ago) |
| Yucatán | Sur y Puuc | Tekax (20.20500, -89.29111) | 1 / 3 / 7 | 555.33 | 9 días (05–13 jun) |
| Yucatán | Sur y Puuc | Oxkutzcab (20.29110, -89.39470) | 3 / 6 / 8 | 537.30 | 9 días (05–13 jun) |
| Campeche | Los Chenes | **Hopelchén** (19.74600, -89.84400) | 1 / 5 / 7 | 472.53 | 12 días (05–16 jun) |
| Campeche | Sur | Escárcega (18.60800, -90.74500) | 1 / 1 / 3 | 653.40 | 5 días (06–10 jun) |
| Campeche | Sur | Candelaria (18.18600, -91.04700) | 0 / 1 / 1 | 721.17 | 4 días (09–12 jun) |
| Quintana Roo | Zona maya | **Felipe Carrillo Puerto** (19.57700, -88.04500) | 9 / 16 / 18 | 464.51 | 8 días (06–13 jun) |
| Quintana Roo | Sur | Bacalar (18.67800, -88.39200) | 10 / 13 / 19 | 643.72 | 8 días (06–13 jun) |
| Yucatán | Puuc, referencia previa | Muna (20.49000, -89.75000) | 1 / 4 / 8 | 468.75 | 12 días (06–17 jun) |

**Lectura.** Valladolid tuvo 9 temporadas con el umbral central y Tizimín tuvo 4. Tekax tuvo 3 y Oxkutzcab 6. La elección del punto y del umbral cambia el resultado. Muna conserva 488.48 mm y una racha máxima de 5 días en 2022, frente a 468.75 mm y 12 días en 2025. En Felipe Carrillo Puerto, la racha máxima de la ventana fue de 17 días en 2022 y de 8 días en 2025. La frecuencia anterior describe el historial de la ventana y puede cambiar al aplicar las fechas del cultivo.

### Referencias de estaciones para validar IMERG

Inventario de CONAGUA consultado. Los números son identificadores del catálogo web y sirven para localizar cada estación. Se verificó su ubicación en el inventario y queda pendiente descargar, depurar y cotejar las observaciones diarias.

| Punto de NASA | Estación candidata |
|---|---|
| Umán | Umán (5305) |
| Valladolid | Valladolid (5299) |
| Tizimín | Tizimín (5287) |
| Tekax | Tekax (5286) |
| Oxkutzcab | Oxkutzcab (5314) |
| Hopelchén | Hopelchén (390) |
| Escárcega | Escárcega (387) |
| Candelaria | Candelaria (381) |
| Felipe Carrillo Puerto | Felipe Carrillo Puerto (3864) |
| Bacalar | Bacalar (3829) |
| Muna | Muna (5274) |

Para Bacalar también figura San Felipe Bacalar (3862). Para Felipe Carrillo Puerto figura una segunda estación, DGE (3830). Para Candelaria usar **Candelaria (SMN), Campeche**, con ID 381. El listado incluye otra estación con el mismo nombre en distintas coordenadas. [Inventario geográfico del SMN](https://smn.conagua.gob.mx/tools/PHP/ConsultaCluster.php?clave=4&tipo=ENCS) · [Histórico y manual de consulta](https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/informacion-estadistica-climatologica)

## 3. Datos agrícolas municipales depurados

Descargué los **23 CSV municipales de DGSIAP (2003–2025)**. Para maíz seleccioné **Maíz grano** (7490000), **Temporal** (2), **Primavera–Verano** (2) y la unidad tonelada. La unión usa clave estatal de dos dígitos y municipal de tres. Normalicé el encabezado de cultivo de 2015–2020 y conservé los CADER distintos dentro de cada municipio. Los registros exactos duplicados en el subconjunto peninsular primavera–verano de temporal fueron **0**. Para calcular el rendimiento municipal sumé la producción y la superficie cosechada, y luego dividí toneladas entre hectáreas cosechadas. [DGSIAP, CSV anuales y diccionarios](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php) · [Descarga directa del CSV de 2025](https://nube.agricultura.gob.mx/index.php?view=10AE434F-A2158368-A120BC5A-EDF4AFAA&ANIO=2025)

| Municipio | Clave | Años con fila | Años con rendimiento calculable | Sembrada 2025 (ha) | Cosechada 2025 (ha) | Producción 2025 (t) | Rendimiento 2025 (t/ha) |
|---|---|---:|---:|---:|---:|---:|---:|
| Umán | `31101` | 23 | 23 | 100 | 100 | 76.67 | 0.77 |
| Valladolid | `31102` | 23 | 21 | 6 930 | 6 930 | 7 662.44 | 1.11 |
| Tizimín | `31096` | 23 | 21 | 3 159 | 3 159 | 3 707.41 | 1.17 |
| Tekax | `31079` | 23 | 23 | 7 010 | 7 010 | 16 486.97 | 2.35 |
| Oxkutzcab | `31056` | 23 | 23 | 3 480 | 3 480 | 8 294.93 | 2.38 |
| Hopelchén | `04006` | 23 | 23 | 43 492 | 43 492 | 196 886.14 | 4.53 |
| Escárcega | `04009` | 23 | 23 | 14 800 | 14 800 | 30 837.31 | 2.08 |
| Candelaria | `04011` | 23 | 23 | 12 000 | 12 000 | 25 680.00 | 2.14 |
| Felipe Carrillo Puerto | `23002` | 23 | 21 | 15 000 | 15 000 | 10 404.02 | 0.69 |
| Bacalar | `23010` | 13 | 13 | 14 000 | 14 000 | 29 449.22 | 2.10 |
| Muna | `31053` | 23 | 23 | 1 264 | 1 264 | 4 024.07 | 3.18 |

Los registros cubren **2003–2025** en los municipios de la tabla, excepto **Bacalar**, donde el primer dato obtenido fue **2013** y la serie llega hasta 2025. Bacalar se creó como municipio en 2011. Mantener los años previos sin fila como ausentes y conservar el cambio territorial si se construye una serie larga. Un registro con 0 hectáreas cosechadas puede ser informativo sobre pérdidas, y su rendimiento por hectárea cosechada queda indefinido. En Hopelchén, el rendimiento municipal de 2025 es de aproximadamente **4.53 t/ha** al agregar los CADER Hopelchén y Dzibalchén. [Congreso de Quintana Roo, creación de Bacalar](https://documentos.congresoqroo.gob.mx/historial/13_legislatura/diarios_debates/2anio/1PO/AL132011111721.pdf) · [DGSIAP, cierre agrícola](https://www.gob.mx/agricultura/dgsiap/prensa/cierre-de-la-produccion-agropecuaria?idiom=es)

### Presencia de cultivos y evidencia para cada plan

| Cultivo | Qué quedó verificado | Qué puede hacer jaibaSpace |
|---|---|---|
| **Maíz grano** | Hay registro municipal de temporal primavera–verano en los 11 municipios de la tabla. INIFAP evaluó nueve genotipos comerciales en cinco localidades peninsulares y estudió la interacción genotipo–ambiente. | Usar maíz como cultivo base. Registrar variedad o grupo de madurez y fecha del productor si las conoce. Los rendimientos municipales son referencias descriptivas. |
| **Canavalia** | Un ensayo del sur de Yucatán evaluó canavalia y mucuna en asociación y en barbechos de uno o dos años antes del maíz Blanco Uxmal, con distintos tratamientos de fósforo. Una tesis de Chapingo estudió leguminosas de cobertura en Calakmul, Campeche. | Usarla para explorar cobertura. El desempeño depende del tratamiento, el manejo y la duración. Mantener fechas y beneficios cuantitativos como desconocidos hasta verificarlos para la parcela objetivo. |
| **Frijol x’pelón** | El cierre 2025 usa el nombre **Frijol x pelón**. Entre los registros de temporal primavera–verano aparecen **Oxkutzcab (38 ha sembradas)**, **José María Morelos (35 ha)**, **Akil (19 ha)**, **Maní (11 ha)**, **Ticul (9 ha)**, **Sacalum (7 ha)**, **Dzán (4 ha)** y **Halachó (3 ha)**. José María Morelos figura dentro del distrito de Felipe Carrillo Puerto y es un municipio distinto. El catálogo de Quintana Roo documenta la equivalencia con *Vigna unguiculata*. | Usar x’pelón → maíz como escenario. La estadística confirma presencia local y el estudio de asociación con maíz respalda explorar el cultivo. Para cuantificar la secuencia se requieren resultados de esa rotación. |

Fuentes: [INIFAP, prueba de genotipos de maíz](https://cienciasagricolas.inifap.gob.mx/index.php/agricolas/es/article/view/3778) · [SciELO, ensayo de canavalia y maíz](https://www.scielo.org.mx/pdf/tl/v27n1/v27n1a8.pdf) · [Universidad Autónoma Chapingo, Calakmul](https://repositorio.chapingo.edu.mx/items/4e6f9aec-fa39-41d3-b152-7e2c93e1310c) · [Estudio de maíz asociado a caupí](https://doi.org/10.1002/agg2.70069) · [Quintana Roo, catálogo del x’pelón](https://sedeturqroo.gob.mx/ARCHIVOS/RescateRecetas.pdf) · [DGSIAP, CSV 2025](https://nube.agricultura.gob.mx/index.php?view=10AE434F-A2158368-A120BC5A-EDF4AFAA&ANIO=2025)

## 4. Calendario local para alimentar el algoritmo

Estas referencias históricas corresponden a sistemas descritos por INIFAP. Sirven para acotar una ventana de siembra y guiar la captura. La fecha de floración y otras etapas se deben respaldar por variedad, sistema y localidad o con datos del productor. Registrar fuente, año, lugar, cultivo, variedad, modalidad y páginas. El calendario DGSIAP complementa la revisión con el avance agregado de siembra y cosecha.

| Estado | Evidencia de maíz de temporal | Cómo aplicarla |
|---|---|---|
| **Yucatán** | La Agenda Técnica 2015, sección «Maíz», pp. 83–84, considera siembra mecanizada desde el inicio del temporal hasta el **15 de julio** en k’ankab y ya’ax-hom. Para ciertos ak’alchés distingue siembra en seco y siembra manual según las condiciones de acceso. | La ventana depende del suelo, el manejo y el establecimiento de la lluvia. La Mesa Técnica Agroclimática subraya que el temporal se establece en fechas distintas según la zona. |
| **Campeche** | La Agenda Técnica 2015, sección «Maíz de temporal», indica **1 de junio a 31 de julio** y **15 de junio a 15 de julio** como período óptimo descrito para labranza tradicional con temporal establecido. La guía distingue cero labranza. Su tabla reporta, por ejemplo, **54, 55 y 59 días a floración** para V-537C, V-556AC y VS-536, respectivamente, bajo el contexto de esa guía. | Sirve de referencia documentada para una demo de maíz con una variedad concreta. La ventana sensible alrededor de la floración y su aplicación en Los Chenes deben documentarse explícitamente. |
| **Quintana Roo** | La Agenda Técnica 2017 describe para **milpa tradicional** una ventana de **15 de mayo a 30 de junio**, ampliable hasta **15 de julio** si se retrasa el temporal. La sección de suelo mecanizable de temporal presenta una ventana similar para el sistema que describe. | En la Zona maya, usar la sección de milpa cuando el productor reporta ese sistema. Conservar la fecha de siembra del usuario y la variedad como campos independientes. |
| **Canavalia y x’pelón** | El ensayo de Yucatán tiene fechas experimentales y DGSIAP registra el ciclo productivo de x’pelón en algunos municipios. | Guardar las fechas de los ensayos como evidencia con lugar y año. Usar `null` para fechas locales aún desconocidas y mostrar «Calendario por confirmar» en el cálculo correspondiente. |

Fuentes: [INIFAP Yucatán 2015](https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_agendas/3109_4814_Agenda_Tecnol%C3%B3gica_Yucat%C3%A1n_2015.pdf) · [INIFAP Campeche 2015](https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_agendas/3084_4789_Agenda_Tecnol%C3%B3gica_Campeche_2015.pdf) · [INIFAP Quintana Roo 2017](https://vun.inifap.gob.mx/VUN_MEDIA/BibliotecaWeb/_media/_agendas/4140_4837_Agenda_T%C3%A9cnica_Quintana_Roo_2017.pdf) · [Mesa Técnica Agroclimática de Yucatán](https://www.cimmyt.org/content/uploads/sites/2/2024/11/Boletin-MTA-Yucatan-02.pdf) · [Mesa Técnica Agroclimática de Campeche](https://www.cimmyt.org/content/uploads/sites/2/2024/11/Boletin-MTA-Campeche-03.pdf) · [DGSIAP, Calendario Agrícola](https://nube.agricultura.gob.mx/calendario_agricola/)

## 5. Suelo, vegetación y otras capas

| Capa | Cobertura, escala y estado | Decisión de integración |
|---|---|---|
| **INEGI Edafología Serie III** | Conjunto nacional, **1:250 000**, mapas con observaciones de **2013–2020** y clasificación **WRB 2014**, edición nacional 2024. | Intersectar la coordenada o el polígono de la parcela con la capa y conservar unidad, escala y fuente. Tratar el resultado como suelo cartografiado del entorno. |
| **Tipo de suelo maya** | **Tsek’el** se documenta como suelo con abundante roca y en descripciones locales como somero. **K’ankab** se asocia con suelo rojizo y admite variaciones locales. **Ak’alche** se vincula con encharcamiento. | Registrar el término que reconoce el productor, además de indicadores como pedregosidad, drenaje, profundidad y encharcamiento cuando los conozca. Mantener por separado la descripción WRB, pues la correspondencia depende del lugar y del perfil. |
| **INEGI Censo Agropecuario 2022** | Tabulados estatales y municipales con información estructural, como unidades de producción y características del riego. | Útil para perfilar al usuario y comprobar afirmaciones sobre el sector. La superficie de maíz de DGSIAP tampoco permite inferir por sí sola el porcentaje de productores que siembra maíz. |
| **CONAGUA / SMN: estaciones y Monitor de Sequía** | Estaciones con mediciones de 24 horas. El monitor ofrece categorías D0–D4 y un archivo municipal. El SMN cambió su criterio de asignación municipal a partir de 2016. | Priorizar las estaciones para contrastar IMERG. El monitor puede mostrarse como contexto oficial de sequía con fecha y escala propias. |
| **NASA SMAP L4** | Humedad superficial y en la zona de raíces a **9 km**. Es un producto de asimilación que combina observaciones y modelo. | Extensión para contextualizar la disponibilidad regional de agua. Falta comprobar la calidad y disponibilidad por punto y fecha. |
| **NASA HLS** | Índices de vegetación a **30 m** con revisitas frecuentes. Las nubes, sombras y píxeles mixtos afectan el uso agrícola. | Extensión para medir cambios históricos de verdor si hay polígonos de parcelas y una máscara de calidad. Para atribuir el verdor a canavalia o x’pelón hace falta conocer qué se sembró. |
| **NASA POWER: temperatura y proyecciones** | Temperatura de la serie meteorológica principal a una rejilla más gruesa que IMERG. Las proyecciones climáticas NEX-GDDP-CMIP6 son globales a aprox. **25 km** y representan escenarios de largo plazo. | Temperatura como ampliación tras definir una regla agronómica. Proyecciones para un módulo de escenarios futuros con modelo, período y escenario visibles. |
| **Pronóstico operativo** | Perspectiva mensual del SMN y pronóstico numérico global GFS para días próximos. | Integrar por separado si el producto necesita hablar de lluvia futura. Guardar hora de emisión, horizonte, unidad, ubicación y modelo. |

Fuentes: [INEGI, Edafología Serie III](https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=794551118313) · [INEGI, Censo Agropecuario 2022](https://www.inegi.org.mx/programas/ca/2022/) · [Estudio de clasificación maya y WRB](https://doi.org/10.1155/2013/634260) · [Gobierno de Yucatán, clasificación y encharcamiento](https://www.ccpy.gob.mx/pdf/agenda-yucatan/documentos-estatal/anexos_peacc/anexo5.pdf) · [SMN, Monitor de Sequía en México](https://smn.conagua.gob.mx/es/climatologia/monitor-de-sequia/monitor-de-sequia-en-mexico) · [SMAP L4](https://nsidc.org/data/spl4smgp/versions/8) · [NASA HLS](https://science.nasa.gov/mission/landsat/hls-vegetation-indices/) · [NASA POWER, proyecciones](https://power.larc.nasa.gov/docs/methodology/data/sources_future/) · [SMN, perspectiva de precipitación](https://wwwsmn.conagua.gob.mx/es/climatologia/pronostico-climatico/precipitacion-form) · [NOAA, GFS](https://emc.ncep.noaa.gov/emc/pages/ncep-numerical-forecast-systems.php)

### Qué devolvió el cruce con la capa real de INEGI

Descargué el shapefile nacional y crucé los **11 puntos climáticos** desde EPSG:4326 con los polígonos de la capa `area`. Cada punto intersectó una sola unidad. El cruce usa las coordenadas solicitadas a NASA. Los resultados describen ese punto del mapa, mientras que la serie climática describe su celda IMERG.

| Puntos de la sección 2 | Clave WRB cartografiada | Grupo dominante en el punto | Textura |
|---|---|---|---|
| Umán, Valladolid, Tizimín, Tekax, Hopelchén, Escárcega, Candelaria, Felipe Carrillo Puerto y Bacalar | `TCek-ub` | Technosol, con calificador urbano en la clave | No aplica según la capa |
| Oxkutzcab | `NTro-lv+CMlen-cr/3` | Nitisol | Fina |
| Muna | `LPli-sk+PHrz-lep/2` | Leptosol | Media |

**Implicación para los tres puntos del MVP.** Sus referencias climáticas caen en polígonos urbanos del mapa edafológico. Se pueden conservar para el historial de lluvia. Para asignar contexto de suelo, cruzar las **coordenadas de una parcela rural** y pedir al productor que confirme su descripción; el suelo maya de esa parcela queda pendiente hasta entonces. Asignar el mismo suelo a toda una zona borraría diferencias que ya aparecen al comparar Muna con Oxkutzcab. [INEGI, ficha de la capa y diccionario incluido](https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=794551118313) · [Descarga oficial del shapefile](https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/geografia/tematicas/Edafologia_hist/1_250_000/serie%20III/794551118313_s.zip)

**Fuentes de menor prioridad.** Los catálogos agrícolas USDA sirven para Estados Unidos. Para el contexto mexicano, priorizar INEGI, DGSIAP, SMN e INIFAP. CHIRPS v3 puede ampliar el historial pluviométrico, pero su variante diaria basada en IMERG utiliza ese producto para distribuir acumulados de cinco días. Para evaluar la lluvia diaria de IMERG, la referencia local preferida son estaciones con períodos comparables. [USDA Cropland Data Layer](https://www.nass.usda.gov/Research_and_Science/Cropland/SARS1a.php) · [UCSB, metodología CHIRPS v3](https://www.chc.ucsb.edu/data/chirps3)

## 6. Contrato de datos sugerido y cómo reproducir el análisis

### Estructura mínima para otra IA

| Entidad | Campos recomendados | Validación |
|---|---|---|
| Zona | `zoneId`, `stateCode`, `municipalityCodes[]`, `referencePointIds[]`, `status` | Distinguir las siete zonas del catálogo y las tres habilitadas en el MVP. Definir qué municipios pertenecen a cada zona antes de hacer selección automática. |
| Punto climático | `pointId`, `latitude`, `longitude`, `pointRole`, `sourceUrl`, `dataset`, `gridDeg`, `timeStandard`, `retrievedAt` | Coordenadas en grados decimales y longitud oeste negativa. Distinguir punto de referencia y coordenadas del usuario. Guardar la ubicación del producto que devuelve la API. |
| Precipitación diaria | `pointId`, `dateUtc`, `rainMm`, `qualityStatus` | Una fila por punto y fecha. Leer el centinela de la API, normalizarlo como `null` y registrar inconsistencias. |
| Racha seca | `pointId`, `startDate`, `endDate`, `days`, `thresholdMm`, `windowStart`, `windowEnd`, `missingDays` | Días consecutivos y fechas inclusivas. Identificar si la ventana trunca la racha. |
| Agricultura municipal | `year`, `municipalityCode`, `cropCode`, `cycleCode`, `waterModeCode`, `sownHa`, `harvestedHa`, `lostHa`, `productionT`, `yieldTHa` | Claves como cadenas. Conservar el detalle CADER en origen y derivar los totales. Rendimiento municipal solo con denominador positivo. |
| Parcela y suelo | `parcelId`, `zoneId`, `geometry`, `mayaSoil`, `mayaSoilSource`, `mappedSoil`, `soilMapSource`, `producerPriority` | `mayaSoilSource` identifica dato declarado o validado en campo. Guardar un estado de demostración para parcelas ficticias. |
| Plan y ciclo | `planId`, `cycleIndex`, `crop`, `variety`, `plantDate`, `sensitiveStart`, `sensitiveEnd`, `evidenceUrl`, `calendarStatus` | Fechas ausentes en `null`. En DGSIAP, `Idciclo=2` corresponde a primavera–verano. En un plan de la app, `cycleIndex=2` identifica el segundo ciclo de la secuencia. |

### Extracción y controles

1. **NASA.** Solicitar `IMERG_PRECTOT` con `community=AG`, `format=JSON`, `start=20010101`, `end=20251231` y `time-standard=UTC`. Cambiar latitud y longitud con la tabla de la sección 2. El mapa de valores está en `properties.parameter.IMERG_PRECTOT` y la unidad en `parameters`. [Consulta reproducible de Umán](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=IMERG_PRECTOT&community=AG&longitude=-89.787&latitude=20.834&start=20010101&end=20251231&format=JSON&time-standard=UTC) · [Hopelchén](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=IMERG_PRECTOT&community=AG&longitude=-89.844&latitude=19.746&start=20010101&end=20251231&format=JSON&time-standard=UTC) · [Felipe Carrillo Puerto](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=IMERG_PRECTOT&community=AG&longitude=-88.045&latitude=19.577&start=20010101&end=20251231&format=JSON&time-standard=UTC).
2. **DGSIAP.** Descargar por año, mapear encabezados `Nomcultivo` / `Nomcultivo Sin Um`, normalizar claves con ceros a la izquierda, comprobar cultivo y unidad, conservar el ciclo PV y modalidad de temporal, y agregar CADER por municipio-año. Si se incorporan x’pelón o canavalia, consultar los catálogos con nombre y código, y conservar la categoría de cultivo original. Un renglón de «Frijol» sin identificación de especie queda como «Frijol». [DGSIAP, portal de descarga y diccionarios](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php).
3. **SMN.** Alinear con cuidado la fecha y la hora de cierre del acumulado de 24 horas de la estación frente al intervalo UTC de NASA. Seleccionar años comunes y medir días válidos. Comparar sesgo, error absoluto, aciertos de día seco y detección de rachas por fecha. Presentar el tamaño del solapamiento. Una estación con pocos años válidos puede usarse como comprobación puntual. [SMN, datos climatológicos](https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/informacion-estadistica-climatologica).
4. **INEGI.** Conservar la proyección y datum originales. Transformar las coordenadas antes del cruce espacial. Una parcela sobre un límite cartográfico puede intersectar varias unidades. Conservar su área de intersección y pedir confirmación en campo si importa para la regla agrícola. [INEGI, Edafología](https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=794551118313).

### Cálculo que puede implementar el MVP

- Detectar rachas en la serie diaria continua, con umbral y longitud visibles. Un faltante interrumpe la secuencia observable y vuelve incompleta cualquier ventana afectada. Para reproducir exactamente la tabla, recortar primero a junio–agosto de cada año. Para evaluar los planes, usar una ventana que cubra toda la etapa correspondiente y documentar si las rachas se recortan al límite.
- Para cada temporada y ciclo, calcular días de intersección entre la racha y la etapa sensible. Dos intervalos inclusivos se solapan en `max(0, min(finRacha, finEtapa) - max(inicioRacha, inicioEtapa) + 1)` días. Documentar si el evento cuenta con un solo día de intersección o exige un mínimo agronómico.
- Reportar «Hubo coincidencia en X de N temporadas con datos suficientes». Si falta el calendario, el resultado del cultivo queda como `null`. Si las fechas y el maíz del segundo ciclo son iguales en todos los planes, la exposición histórica para ese ciclo coincide.
- Validar con años consecutivos retenidos al final si se entrena cualquier modelo. Comparar contra una frecuencia climatológica base y reportar rendimiento en años fuera de entrenamiento. Al explorar más ubicaciones, reservar municipios completos para medir la capacidad de generalizar. Los miles de días de una misma serie están relacionados y, para la frecuencia anual del ejemplo, aportan 25 temporadas por punto.

## 7. Qué se puede construir y qué falta

| Resultado | Estado de los datos | Próximo dato útil |
|---|---|---|
| **Historial de lluvia y rachas por punto, en las siete zonas** | **Listo para alimentar el MVP.** Serie NASA verificada con puntos principales y secundarios. | Cachear datos para la demo y documentar cobertura de cada ubicación. |
| **Cruce de clima y cultivo** | **Implementable con fechas ingresadas** y con referencias históricas de INIFAP para maíz. | Completar fechas y etapas por cultivo, localidad y variedad. Comenzar con Umán, Hopelchén y Felipe Carrillo Puerto. |
| **Comparación de tres planes** | **Viable como escenarios** con evidencia local de cada cultivo. | Confirmar la práctica actual de la parcela, el calendario de las leguminosas, disponibilidad de semilla y prioridad del productor. |
| **Alerta futura de lluvia** | **Requiere un pronóstico operativo** y un horizonte explícito. | Incorporar SMN o un modelo como GFS según la escala temporal. |
| **Pronóstico de rendimiento por rotación y parcela** | **Datos insuficientes para validar.** DGSIAP aporta resultados agregados de maíz. | Reunir datos de parcelas con rotación observada, variedad, suelo, fechas, manejo y cosecha. Se puede explorar un modelo municipal con DGSIAP y clima representativo del municipio, con validación temporal y espacial. |
| **Diagnóstico de estrés hídrico o mejora de suelo** | **Requiere indicadores adicionales.** La lluvia caracteriza exposición, y el estrés depende del cultivo, el suelo y la demanda de agua. | Medidas de suelo o un balance hídrico validado con insumos de parcela. [FAO, requisitos de AquaCrop](https://www.fao.org/aquacrop/overview/input-requirements/es). |

## 8. Instrucción para la IA que reciba este archivo

> Usa este documento como contexto de jaibaSpace. Toma Umán, Hopelchén y Felipe Carrillo Puerto como puntos de referencia para el MVP. Aplica los criterios de depuración descritos y conserva las siete zonas. Cita la fuente original y marca cada valor como dato de fuente, resultado calculado, entrada del productor, supuesto de demo o dato pendiente. Diseña primero el cálculo de exposición histórica por etapa en los tres planes para la misma parcela. Si un dato falta, indícalo en la respuesta y en el contrato de datos. Para predicciones futuras o de rendimiento, pide los insumos específicos de ese objetivo. Si accedes al repositorio, examina su esquema y sus rutas antes de elegir nombres o formatos definitivos.

**Alcance comprobado de esta revisión:** series IMERG, CSV municipales DGSIAP, cruce de puntos con Edafología Serie III, inventario de estaciones y documentación citada. Quedan pendientes el cotejo con las series de las estaciones, un calendario completo de las leguminosas para las siete zonas, la validación a escala de parcela y la revisión de la implementación del repositorio.

## Anexo. Series anuales resumidas para comprobar una implementación

Las columnas siguen el orden de los puntos de la sección 2. En la primera tabla, cada celda es la duración en días de la racha máxima entre junio y agosto con umbral <1 mm. En la segunda, cada celda es el rendimiento municipal de maíz grano de temporal en primavera–verano, calculado en t/ha. El guion representa rendimiento indefinido o fila ausente. Para Bacalar faltan filas 2003–2012. Para los demás casos con guion existe una fila y su superficie cosechada suma cero.

### NASA POWER / IMERG · Racha máxima (días)

| Año | Umán | Valladolid | Tizimín | Tekax | Oxkutzcab | Hopelchén | Escárcega | Candelaria | F. C. Puerto | Bacalar | Muna |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2001 | 9 | 12 | 9 | 9 | 9 | 8 | 5 | 3 | 14 | 13 | 8 |
| 2002 | 9 | 8 | 6 | 8 | 13 | 6 | 6 | 5 | 10 | 7 | 10 |
| 2003 | 5 | 11 | 13 | 10 | 10 | 6 | 5 | 3 | 14 | 11 | 6 |
| 2004 | 5 | 7 | 7 | 5 | 4 | 10 | 6 | 6 | 10 | 7 | 7 |
| 2005 | 6 | 5 | 4 | 7 | 6 | 6 | 4 | 5 | 8 | 6 | 6 |
| 2006 | 8 | 5 | 4 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | 5 |
| 2007 | 6 | 6 | 4 | 6 | 6 | 5 | 4 | 8 | 9 | 9 | 3 |
| 2008 | 5 | 4 | 9 | 6 | 9 | 5 | 4 | 5 | 8 | 16 | 9 |
| 2009 | 8 | 7 | 5 | 8 | 8 | 5 | 6 | 6 | 8 | 9 | 7 |
| 2010 | 5 | 15 | 7 | 7 | 12 | 5 | 3 | 4 | 10 | 11 | 7 |
| 2011 | 4 | 5 | 6 | 5 | 7 | 7 | 7 | 6 | 10 | 12 | 5 |
| 2012 | 7 | 6 | 4 | 6 | 6 | 8 | 3 | 3 | 10 | 10 | 6 |
| 2013 | 6 | 9 | 5 | 8 | 8 | 8 | 4 | 4 | 9 | 9 | 9 |
| 2014 | 6 | 8 | 6 | 9 | 19 | 14 | 9 | 6 | 12 | 17 | 11 |
| 2015 | 6 | 12 | 11 | 8 | 8 | 10 | 5 | 5 | 17 | 18 | 7 |
| 2016 | 5 | 4 | 4 | 4 | 5 | 4 | 5 | 6 | 11 | 12 | 5 |
| 2017 | 5 | 5 | 4 | 4 | 3 | 5 | 4 | 2 | 13 | 13 | 5 |
| 2018 | 5 | 7 | 4 | 6 | 7 | 8 | 6 | 4 | 17 | 15 | 9 |
| 2019 | 10 | 12 | 8 | 11 | 11 | 7 | 5 | 9 | 15 | 23 | 8 |
| 2020 | 7 | 13 | 6 | 5 | 5 | 5 | 8 | 5 | 11 | 7 | 5 |
| 2021 | 6 | 11 | 6 | 10 | 8 | 10 | 6 | 5 | 10 | 9 | 7 |
| 2022 | 4 | 11 | 10 | 5 | 5 | 6 | 3 | 5 | 17 | 9 | 5 |
| 2023 | 11 | 10 | 14 | 9 | 10 | 9 | 16 | 13 | 9 | 11 | 10 |
| 2024 | 10 | 7 | 7 | 7 | 7 | 7 | 6 | 6 | 7 | 7 | 7 |
| 2025 | 9 | 9 | 7 | 9 | 9 | 12 | 5 | 4 | 8 | 8 | 12 |

### DGSIAP · Rendimiento municipal (t/ha)

| Año | Umán | Valladolid | Tizimín | Tekax | Oxkutzcab | Hopelchén | Escárcega | Candelaria | F. C. Puerto | Bacalar | Muna |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2003 | 0.70 | 0.64 | 0.60 | 1.07 | 1.31 | 2.22 | 0.77 | 0.80 | 0.70 | — | 1.19 |
| 2004 | 0.69 | 0.80 | 0.65 | 1.95 | 1.49 | 3.79 | 0.80 | 0.82 | — | — | 1.63 |
| 2005 | 0.69 | — | — | 1.91 | 1.50 | 4.42 | 0.81 | 0.79 | 0.80 | — | 1.70 |
| 2006 | 0.74 | 0.70 | 0.90 | 2.09 | 1.46 | 3.74 | 0.82 | 0.79 | 0.75 | — | 1.72 |
| 2007 | 0.70 | 0.70 | 0.99 | 1.90 | 1.53 | 2.38 | 0.77 | 0.86 | 0.35 | — | 1.70 |
| 2008 | 0.25 | — | 0.26 | 2.10 | 0.70 | 2.20 | 0.84 | 1.39 | — | — | 2.01 |
| 2009 | 0.30 | 0.20 | — | 1.10 | 1.15 | 3.05 | 0.65 | 0.71 | 0.30 | — | 0.47 |
| 2010 | 0.50 | 0.70 | 0.70 | 0.70 | 0.78 | 3.74 | 0.74 | 0.72 | 0.80 | — | 3.00 |
| 2011 | 0.79 | 0.70 | 0.90 | 2.60 | 2.02 | 3.63 | 0.94 | 0.89 | 0.80 | — | 3.10 |
| 2012 | 0.35 | 0.65 | 0.47 | 1.80 | 0.63 | 2.17 | 0.93 | 1.17 | 0.40 | — | 3.00 |
| 2013 | 0.39 | 0.70 | 0.35 | 1.34 | 0.65 | 3.66 | 0.76 | 0.71 | 0.30 | 1.35 | 2.90 |
| 2014 | 0.62 | 0.56 | 0.40 | 1.24 | 0.80 | 3.05 | 0.79 | 0.95 | 0.20 | 1.61 | 2.80 |
| 2015 | 0.48 | 0.49 | 0.55 | 1.43 | 1.09 | 3.20 | 0.52 | 0.68 | 0.21 | 1.76 | 2.79 |
| 2016 | 0.52 | 0.41 | 0.35 | 0.61 | 0.83 | 3.39 | 0.69 | 0.67 | 0.23 | 0.63 | 2.80 |
| 2017 | 0.55 | 0.55 | 0.56 | 1.30 | 1.12 | 3.79 | 0.77 | 0.75 | 0.69 | 1.64 | 2.70 |
| 2018 | 0.65 | 0.58 | 0.70 | 0.77 | 1.23 | 3.56 | 0.91 | 0.91 | 0.75 | 1.60 | 2.90 |
| 2019 | 0.47 | 0.69 | 0.52 | 1.90 | 2.18 | 3.61 | 0.94 | 0.83 | 0.26 | 1.00 | 2.80 |
| 2020 | 0.62 | 0.68 | 0.59 | 2.01 | 2.20 | 3.86 | 1.04 | 0.65 | 1.60 | 1.35 | 2.84 |
| 2021 | 0.58 | 0.68 | 0.59 | 1.86 | 2.10 | 3.59 | 1.07 | 1.00 | 0.61 | 1.86 | 2.70 |
| 2022 | 0.58 | 0.71 | 0.60 | 2.01 | 2.20 | 2.01 | 1.64 | 1.90 | 0.62 | 2.04 | 2.80 |
| 2023 | 1.12 | 0.74 | 1.16 | 2.14 | 1.59 | 3.37 | 1.94 | 1.92 | 0.79 | 2.16 | 2.90 |
| 2024 | 0.59 | 0.94 | 0.99 | 2.22 | 2.20 | 4.11 | 1.90 | 2.00 | 0.78 | 1.68 | 3.00 |
| 2025 | 0.77 | 1.11 | 1.17 | 2.35 | 2.38 | 4.53 | 2.08 | 2.14 | 0.69 | 2.10 | 3.18 |
