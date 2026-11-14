# Contexto de la sesión de trabajo (2026‑11‑14)

> **Para qué sirve este archivo:** resume lo que se decidió, se construyó y se discutió con Claude en la sesión del 14 de noviembre de 2026. Sirve para retomar el trabajo (con una persona o con una IA) sin releer todo el chat. Si algo de aquí contradice a `docs/contrato-datos.md`, manda el contrato.

---

## 1. Qué es el proyecto

- **Equipo:** jaibaSpace, NASA Space Apps Challenge 2026.
- **Reto:** *Field Shift: Adapting Farms with NASA Data* (texto oficial en [`reto-oficial.md`](reto-oficial.md)).
- **Producto en una frase:** una app para el teléfono que ayuda a un productor de maíz de temporal de la **Península de Yucatán** (Yucatán, Campeche y Quintana Roo) a decidir qué **rotación** le conviene para su parcela, usando **28 años de datos de la NASA** de su zona (1998–2025), y que **funciona sin internet**.
- **Usuario:** el productor de temporal (sin riego) desde su teléfono; también el técnico que lo asesora.
- **Lo que dice la app:** «con los datos de los últimos 28 años, esta opción expone menos tu cultivo a la sequía y cuida mejor tu suelo».
- **Lo que no dice:** «vas a cosechar más». **No predice cosechas** y apoya la decisión del productor, no la reemplaza.

## 2. Cómo evolucionó la idea en el chat

| Paso | Qué se pidió | Resultado |
|---|---|---|
| 1 | Analizar el proyecto por partes y decir qué se intenta expresar | Diagnóstico: la idea (rotaciones con clima) se entendía, pero faltaban piezas que pide el reto |
| 2 | ¿Se ve que es una app de rotaciones con clima? ¿Qué falta del reto? | Faltaba comparar **varias estrategias**, explicar el **por qué**, beneficios y riesgos, y usar datos locales |
| 3 | El usuario pegó los *Resources* y *Details* oficiales | Se compararon con el proyecto y se propusieron 6 cambios |
| 4 | «Ejecútalo, con enfoque a nivel península» | Se reescribió toda la documentación y se creó el script de datos para las 7 zonas de la península |
| 5 | ¿Me diste rotación o cobertura? | Aclaración: son 4 estrategias; la que en v0.1 se llamaba «rotacion» ahora es `cobertura` |
| 6 | Descripción para el pull request | Entregada |
| 7 | ¿Qué estamos construyendo? | Resumen del producto (sección 1 de este archivo) |
| 8 | Nueva propuesta: base de datos, servidor, datos del gobierno, historial de cosechas, maya | Análisis crítico y propuesta **v0.3 en discusión** (sección 8). **No se ha cambiado nada todavía.** |

El trabajo de los pasos 1 a 7 ya está en el commit `f1735a9 docs: actualiza proyecto y diagramas`.

## 3. Decisiones de diseño vigentes (v0.2)

### Arquitectura

- **PWA estática, sin servidor.** El motor JavaScript `comparar(entrada, { clima, planes, reglas })` es síncrono y puro, y corre en el teléfono.
- **Funciona sin internet:**
  - un *service worker* sirve los archivos estáticos desde la caché (*cache-first*) y los datos con *stale-while-revalidate*;
  - guarda de antemano todos los `data/clima/*.json` (unos 850 KB).
- **Hosting HTTPS:** GitHub Pages, Netlify o Vercel.
- **Python solo prepara datos** antes de publicar (`data-pipeline/clima.py`); no es parte de la app.
- **Pronóstico de 7 días: fuera del MVP**, porque el reto no lo pide.

### Datos de la NASA

- Vienen de la **API diaria de NASA POWER**, en horario UTC.
- Los faltantes llegan como `-999` y se guardan como `null`.

| Parámetro | Producto | Resolución | Para qué |
|---|---|---|---|
| `IMERG_PRECTOT` | Lluvia GPM IMERG | ~10 km, desde 1998 | Rachas secas |
| `T2M_MAX` | Temperatura máxima MERRA‑2 | ~50 km | Días de calor |

### Zonas

- Hay **7 zonas agroclimáticas**, cada una con un punto representativo.
- La parcela se asigna a la zona **más cercana** (distancia Haversine), y la distancia **siempre se muestra**.

| Id | Zona |
|---|---|
| `yuc-noroeste` | Noroeste de Yucatán |
| `yuc-oriente` | Oriente de Yucatán |
| `yuc-sur` | Sur de Yucatán |
| `camp-chenes` | Los Chenes, Campeche |
| `camp-sur` | Sur de Campeche |
| `qroo-centro` | Zona maya de Quintana Roo |
| `qroo-sur` | Sur de Quintana Roo |

### Suelos mayas

El suelo ajusta cuántos días seguidos sin lluvia cuentan como racha seca, y cada suelo tiene una aptitud por cultivo.

| Suelo | Equivalente | Ajuste a la racha |
|---|---|---|
| *tsek'el* (pedregoso) | Leptosol | −1 día |
| *k'ankab* (rojo, profundo) | Luvisol | 0 |
| *ak'alche* (bajo, se inunda) | Gleysol o Vertisol | +1 día |

### Las 4 estrategias (`planes.json`)

| Id | Estrategia | Calendario | Meses sin cubrir | Nitrógeno | Ingreso |
|---|---|---|---:|---|---|
| `actual` | Tu plan actual | Maíz del 15 de junio al 31 de octubre | 7 | bajo | medio |
| `cobertura` | Maíz + cobertura | Maíz más mucuna o canavalia, del 15 de julio al 28 de febrero | 3 | alto | bajo |
| `milpa` | Milpa | Maíz, frijol (15 de junio al 15 de septiembre) y calabaza (15 de junio al 15 de octubre) | 7 | medio | alto |
| `relevo` | Maíz precoz + relevo | Maíz precoz (1 de julio al 15 de octubre), luego frijol (1 de octubre al 31 de diciembre) | 6 | medio | alto |

### Criterios, prioridades y pesos (`reglas.json`)

- **5 criterios:**
  - `rachasSecas`;
  - `estresCalor`;
  - `coberturaSuelo`;
  - `fijacionNitrogeno`;
  - `ingresoForraje`.
- **Cómo se mide la exposición:** se toman los **días críticos**, que son los de etapas con sensibilidad «alta». Se calcula qué proporción de ellos cae dentro de una racha seca o de un episodio de calor (3 o más días a 35 °C o más), y se promedia en 1998–2025. Reemplaza a la métrica de «año afectado sí o no», que daba casi siempre el mismo resultado.
- **Pesos por prioridad:**

| Prioridad | Rachas | Calor | Cobertura | Nitrógeno | Ingreso |
|---|---:|---:|---:|---:|---:|
| `agua` | .45 | .20 | .15 | .10 | .10 |
| `suelo` | .15 | .10 | .45 | .20 | .10 |
| `nitrogeno` | .15 | .10 | .20 | .45 | .10 |
| `ingreso` | .15 | .10 | .10 | .15 | .50 |

- **Empates:** si dos totales difieren 0.02 o menos, se declara **empate**. Por criterio, la tolerancia es 0.05 para rachas y calor, 0.09 para cobertura, y 0 para nitrógeno e ingreso.
- **Salida del motor:**
  - ranking de las 4 estrategias;
  - el mejor plan en cada criterio (`mejores`), o `sinDiferencia` si no hay ganador;
  - los `recomendados`, que pueden ser un empate;
  - para cada estrategia: el por qué, beneficios, riesgos, los datos de la NASA usados y lo que falta confirmar.

## 4. Lo que encontramos en los datos (verificado el 2026‑11‑14)

| Zona | Lluvia anual (mm) | Lluvia jun–ago (mm) | Racha seca más larga jun–ago (mediana, días) | Días ≥35 °C en mayo | Peores años |
|---|---:|---:|---:|---:|---|
| Noroeste de Yucatán | 1109 | 521.8 | 7 | 24 | 1998, 2025, 2014 |
| Oriente de Yucatán | 1322 | 567.4 | 8.5 | 21.5 | 1998, 2010, 2001 |
| Sur de Yucatán | 1133 | 521.7 | 7 | 25.5 | 2014, 1998, 2019 |
| Los Chenes | 1179 | 536.8 | 6.5 | 24 | 1998, 2014, 2025 |
| Sur de Campeche | 1488 | 765.2 | 5 | 26 | 2023, 1998, 2014 |
| Zona maya de Q. Roo | 1344 | 482.5 | 10 | 7.5 | 2015, 2018, 2022 |
| Sur de Q. Roo | 1330 | 501.4 | 9.5 | 0 | 2019, 1998, 2015 |

**Hallazgos para el pitch:**

1. **El total de lluvia engaña.** En el noroeste de Yucatán, 2022 y 2025 tuvieron casi la misma lluvia de junio a agosto (488 contra 469 mm). Pero en 2025 hubo una racha seca de 12 días (6 al 17 de junio) contra 5 en 2022.
2. **Más lluvia al año no significa menos sequía en verano.** Quintana Roo llueve más, pero tiene las rachas de verano más largas de la península.
3. **La zona cambia mucho el riesgo.** La parte de los días críticos del plan actual que cae en racha seca va de 5 % (sur de Campeche, *k'ankab*) a 34 % (Quintana Roo, *tsek'el*).
4. **Mover la siembra dos semanas casi no cambia nada** (10 % contra 11 %). Por eso la cuarta estrategia es el relevo y no un simple cambio de fecha.
5. **La prioridad cambia la recomendación; la zona cambia el nivel de riesgo, no tanto el orden.** Esto pasa en las 7 zonas:

| Prioridad | Recomendación |
|---|---|
| agua | empate cobertura y milpa (en el sur de Quintana Roo también entra el relevo) |
| suelo | cobertura |
| nitrógeno | cobertura |
| ingreso | empate milpa y relevo |

## 5. Archivos del repositorio y su estado

| Archivo | Estado |
|---|---|
| `README.md` | ✅ Reescrito para la península |
| `docs/reto-oficial.md` | ✅ Nuevo: texto oficial y qué recursos aplican a México (✅ NASA POWER; referencia FAO GAEZ; extras SMAP, ERA5, Sentinel‑2/MODIS, GRACE; los de USDA solo cubren Estados Unidos, y sus equivalentes son INEGI, SIAP y CONAGUA) |
| `docs/00-contexto-general.md` | ✅ Qué construimos, la península en datos, reglas de honestidad |
| `docs/contrato-datos.md` | ✅ v0.2: los JSON compartidos y el algoritmo del motor en 12 pasos. Falta congelarlo. |
| `docs/requisitos-y-modelo.md` | ✅ RF‑01 a RF‑21 y RNF‑01 a RNF‑13 |
| `docs/guia-de-trabajo.md` | ✅ Acuerdos del equipo; ideas pospuestas: pronóstico, SMAP, NDVI, GRACE, precios |
| `docs/roles/1…6` | ✅ Reescritos; cada uno sirve de instrucciones para la IA de su integrante |
| `docs/diagramas/*.puml` | ✅ v0.2 (clases y casos de uso). Pendiente: unificar los nombres de sensibilidad (`bajo/medio/alto` en el diagrama contra `baja/media/alta` en el contrato). |
| `data-pipeline/clima.py` | ✅ Funciona y está verificado; solo usa la biblioteca estándar de Python |
| `app/data/` | ⚠️ Vacío (solo `.gitkeep`). Faltan `zonas.json`, `clima/*.json`, `planes.json`, `reglas.json` y `municipios.json`. Los JSON de clima se generaron en una carpeta temporal y **no están en el repo**: hay que crear `zonas.json` y correr `python clima.py ../app/data`. |
| `app/src/motor`, `app/src/ui/*`, `app/fixtures` | ❌ Vacíos: falta programar |

## 6. Estado por rol

| Rol | Entrega | Estado |
|---|---|---|
| 1. Líder técnico | Integración, publicación HTTPS, congelar el contrato | ❌ Pendiente |
| 2. Datos | `clima.py` y los JSON de 7 zonas | ✅ Script listo · ⚠️ falta subir los JSON |
| 3. Reglas agrícolas | Confirmar planes, umbrales y fuentes | 🟡 Propuesta completa, sin fuentes confirmadas |
| 4. Motor y modo sin internet | `comparar()`, `datos.js`, *service worker*, pruebas | ❌ Por programar |
| 5. Captura | Pantalla «Mi parcela» (zona, suelo, prioridad) | ❌ Por programar |
| 6. Resultados | «Tus opciones», «¿Por qué?», «Tu zona en la península», guion de la demo | ❌ Por programar |

## 7. Errores y correcciones durante la sesión

- **Afirmación exagerada:** se dijo que la zona cambiaba al ganador con prioridad ingreso. Con la tolerancia de 0.02 es un empate milpa y relevo en todas las zonas. Se corrigió en contexto, Rol 3 y Rol 6.
- **La métrica de sequía «año afectado sí o no» daba casi siempre lo mismo.** Se cambió por la proporción de días críticos en racha seca.
- **La estrategia «siembra ajustada» se cambió por «relevo»**, porque mover la fecha casi no cambia la exposición.
- **No se pudo abrir la página de spaceappschallenge.org** (error de certificado). El usuario pegó el texto del reto.

## 8. Propuesta v0.3 en discusión (no aplicada)

El equipo propuso agregar:
- una **base de datos** de parcelas;
- un **servidor** de consultas;
- **estadísticas y proyecciones**;
- datos de **dependencias federales y estatales** (semillas, parcelas);
- **geolocalización**;
- **historial de cosechas** o cuestionario;
- **lengua maya**.

### Análisis y recomendación de Claude

**Principio propuesto: sin internet primero; el servidor solo sirve para compartir.**
- La comparación y la captura siguen funcionando en el teléfono sin señal.
- Lo que captura el productor se guarda en el teléfono (IndexedDB, con una cola de envíos pendientes) y se sincroniza cuando hay conexión.
- El servidor solo existe para lo que necesita juntar datos de muchos productores.
- Safari en iPhone no tiene sincronización en segundo plano, así que se sincroniza al abrir la app con señal.

```
TELÉFONO (PWA, sin internet)                SERVIDOR (cuando hay señal)
Motor comparar() igual que hoy  ──sync──▶   FastAPI: POST /parcelas, POST /cosechas,
IndexedDB: parcela, historial,  ◀─────────  GET /estadisticas/zona/:id, GET /catalogos
cola de envíos; textos es/yua               PostgreSQL + PostGIS
                                            ▲ Pipeline Python: NASA + SIAP + INEGI + SNICS
```

| Tema | Postura |
|---|---|
| **Base de datos de parcelas** | Sí, pero con productor **anónimo por defecto**, consentimiento explícito y la ubicación redondeada a zona o municipio. Aplica la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (2025), que pide aviso de privacidad. |
| **Proyecciones** | ❌ No proyectar cosechas: va contra la regla de honestidad y no hay datos suficientes. ✅ Sí proyectar el **clima** con **NASA NEX‑GDDP‑CMIP6** (lluvia y temperatura máxima diarias hasta 2100, ~25 km). ✅ Presentar el pasado como probabilidad: «en 8 de 28 años…». |
| **Datos del gobierno** | **SIAP** es la mejor fuente: superficie sembrada, cosechada y **siniestrada** por municipio, cultivo y año, separando temporal. Permite cruzar las pérdidas con las rachas de la NASA y da estadística aunque nadie haya capturado nada. **SNICS** (Catálogo Nacional de Variedades Vegetales) para semillas, **INIFAP** para variedades y fechas, **INEGI** para municipios y suelos. Hay que confirmar qué publican los estados en formato abierto. Casi todo se actualiza una vez al año, así que se procesa con Python y se guarda en la app, sin servidor. |
| **Geolocalización** | GPS del teléfono, que funciona sin internet, más un archivo simplificado con los límites municipales de INEGI para saber el municipio dentro del teléfono. Sin Google Maps: sin costo, sin señal y sin mandar la ubicación a terceros. |
| **Historial de cosechas** | Lo más valioso de la propuesta: permite decir «en 2019 te fue mal; ese año hubo una racha de 23 días en junio». Cuestionario corto: año, cultivo (con íconos), mes de siembra, cómo le fue (bien, regular o mal), qué pasó (sequía, exceso de lluvia, huracán, plaga) y, de forma opcional, la cosecha en unidades locales (bultos por mecate o por hectárea). |
| **Maya** | Sí. Sin traducción automática: con un hablante nativo y la norma de escritura del INALI. **Audios** de los mensajes clave, porque muchos hablantes no leen maya. Textos en `es.json` y `yua.json` (código del maya yucateco: `yua`). Alcance: etiquetas principales, suelos, estrategias y glosario. |

### Fases propuestas

| Fase | Contenido | Para la demo |
|---|---|---|
| 1 | MVP actual: comparación sin internet, 4 estrategias, 7 zonas | Obligatorio |
| 2 | Sin servidor: historial en el teléfono, cruce con la NASA, SIAP como estadística de zona, maya | Recomendado |
| 3 | Servidor: FastAPI, PostgreSQL y PostGIS, sincronización, estadísticas entre productores, CMIP6 | Con datos de ejemplo o como «lo que sigue» |

### Qué cambiaría si se aprueba

- Contrato a **v0.3**, con entidades `Productor`, `Cosecha` y `Semilla` y los contratos de la API.
- Requisitos nuevos: sincronización, privacidad e idioma.
- Volver a poner el «backend con FastAPI» en la guía de trabajo.
- Un **Rol 7** (servidor y base de datos), o que lo absorba el Rol 2, y una persona responsable de la traducción al maya.
- Diagramas con los casos de uso: registrar cosecha, sincronizar, cambiar idioma.

### Preguntas abiertas para el equipo

1. ¿La v0.3 es para la entrega del hackathon o para después? ¿Cuánto tiempo y cuántas personas hay?
2. «Proyecciones futuras»: ¿de cosecha o de clima? (Se recomienda clima, con CMIP6.)
3. Servidor:
   - **(a)** FastAPI con PostgreSQL y PostGIS (recomendado);
   - **(b)** Supabase;
   - **(c)** todo local por ahora.
4. Identidad: ¿anónima con opción de compartir (recomendado), o registro por teléfono?
5. ¿Hay un hablante nativo de maya que traduzca o grabe audios?
6. ¿Hay alguna fuente estatal concreta ya identificada?
7. Historial: ¿cuestionario corto con «bien, regular o mal», o rendimiento en números?

**Siguiente paso acordado:** cuando el equipo responda, escribir `docs/propuesta-v0.3.md` y, solo con su visto bueno, actualizar el contrato, los roles y los diagramas.

## 9. Pendientes menores

- Crear `app/data/zonas.json` y generar los JSON de clima en el repo.
- Unificar los nombres de sensibilidad en el diagrama de clases.
- Corregir el `.gitignore`: tiene la plantilla de Java.
- Opcional: renombrar `cobertura` a `rotacion-cobertura`.
- Congelar el contrato v0.2 (Rol 1).
