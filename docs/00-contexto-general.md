# jaibaSpace — Contexto general del proyecto

> **Cómo usar estos documentos con tu IA:** dale este archivo, `contrato-datos.md` y el archivo de tu rol en `roles/`. Este archivo explica qué construimos y por qué. El contrato fija los formatos JSON que comparten todos los roles. El archivo de tu rol dice qué te toca entregar.

## 1. El reto

- **Evento:** NASA Space Apps Challenge 2026.
- **Reto:** *Field Shift: Adapting Farms with NASA Data*. El texto oficial completo está en [`reto-oficial.md`](reto-oficial.md).
- **Qué pide:** una herramienta de apoyo a la decisión que use observaciones de la NASA junto con **información local del suelo**, **características de los cultivos** y **prioridades del agricultor** para ayudarle a **explorar estrategias de rotación** que fortalezcan la salud del suelo y adapten su parcela a condiciones cambiantes.
- **Lo que el reto sugiere y nosotros cumplimos:**

| El reto sugiere | Cómo lo cubrimos |
|---|---|
| Comparar **al menos 3 estrategias**, incluida la actual | 4 estrategias: actual, cobertura, milpa y relevo |
| Mostrar cuándo el campo queda **desnudo** | Calendario de 12 meses con los meses descubiertos |
| Mostrar cuándo el cultivo actual es **más vulnerable** | Días críticos del cultivo que caen en rachas secas o en calor |
| Por estrategia: **por qué**, **evidencia**, **beneficios**, **vacíos de información** y **riesgos** | `porQue`, `evidencia` y `datosNasa`, `beneficios`, `faltaConfirmar`, `riesgos` |
| Prioridades: agua, forraje, nitrógeno, erosión, materia orgánica, mercado | 4 prioridades: agua, suelo, nitrógeno, ingreso o forraje |
| Información local del suelo | Tipo de suelo maya (*tsek'el*, *k'ankab*, *ak'alche*) que cambia el umbral de sequía y la aptitud de los cultivos |
| Estrés por calor, lluvia, tendencias de largo plazo | Lluvia GPM IMERG y temperatura máxima MERRA‑2, 1998–2025 |
| Apoyar, **no reemplazar**, el juicio del agricultor | Avisos fijos, datos de ejemplo etiquetados, «falta confirmar en campo» |

## 2. Nuestra propuesta (MVP de un día)

**Una PWA para productores de temporal de la Península de Yucatán** (Yucatán, Campeche y Quintana Roo). El productor indica dónde está su parcela, qué suelo tiene y qué quiere priorizar. La app compara su práctica actual con tres estrategias de rotación usando 28 años de datos de la NASA de **su zona** y le explica cada resultado. Funciona sin conexión.

### Las 4 estrategias

| Estrategia | Ciclos | Idea |
|---|---|---|
| **Actual** | Maíz de temporal (15 jun – 31 oct) | La práctica de referencia; suelo desnudo en secas |
| **Cobertura** | Maíz + mucuna o canavalia intercalada (15 jul – 28 feb) | Cubrir el suelo y fijar nitrógeno |
| **Milpa** | Maíz + frijol + calabaza | La asociación tradicional maya; más ingreso y alimento |
| **Relevo** | Maíz precoz (1 jul) + frijol de relevo (1 oct) | Dos cosechas al año y suelo cubierto hasta diciembre |

### Los 5 criterios

| Criterio | Qué mide | Dato |
|---|---|---|
| **Rachas secas** | Qué parte de los días críticos del cultivo cayó dentro de una racha seca | GPM IMERG vía NASA POWER |
| **Estrés por calor** | Qué parte de los días críticos cayó en un episodio de 35 °C o más | MERRA‑2 `T2M_MAX` vía NASA POWER |
| **Cobertura del suelo** | Cuántos meses al año queda el suelo descubierto | Calendario de cada plan |
| **Fijación de nitrógeno** | Si la estrategia incluye leguminosas | Atributos del plan (Rol 3) |
| **Ingreso o forraje** | Cuántas cosechas o subproductos da | Atributos del plan (Rol 3) |

El productor elige **una** prioridad y la prioridad cambia el peso de cada criterio.

### Pantallas

1. **Mi parcela.** Ubicación por GPS, municipio o mapa de zonas; tipo de suelo (con «no sé»); y la pregunta *«¿Qué quieres priorizar?»*.
2. **Tus opciones.** Las 4 estrategias ordenadas, con la recomendada (o el empate) arriba y un calendario de 12 meses por estrategia.
3. **¿Por qué?** Para cada estrategia: razón en lenguaje simple, dato de la NASA con su fecha, beneficios, riesgos y qué falta confirmar en campo.
4. **Tu zona en la península.** Cómo se compara la zona del productor con el resto: lluvia, rachas secas y peores años.

### Decisiones de arquitectura

- **No hay backend.** El motor `comparar()` es una función de JavaScript que corre en el teléfono.
- **Python solo prepara datos.** El Rol 2 descarga NASA POWER y exporta un JSON por zona; no es un servidor.
- **Datos precalculados.** `zonas.json`, `clima/*.json` (unos 120 KB por zona), `planes.json` y `reglas.json` son archivos estáticos que el *service worker* guarda en caché. La app funciona aunque la NASA no responda o el teléfono esté en modo avión.
- **Hosting estático con HTTPS**, por ejemplo GitHub Pages, Netlify o Vercel. El *service worker* y el GPS solo funcionan con HTTPS (o en `localhost`).
- **Sin pronóstico meteorológico** en el MVP. El reto no lo pide; queda como idea a futuro.

## 3. Fuentes de datos

| Fuente | Qué aporta | Uso en el MVP |
|---|---|---|
| **NASA POWER Daily API** (`power.larc.nasa.gov`) | Series diarias por coordenadas en JSON. Puerta de entrada a IMERG y MERRA‑2. Sin clave. | **Sí, fuente principal.** |
| **GPM IMERG** (`IMERG_PRECTOT`) | Lluvia diaria en mm/día, rejilla de unos 10 km, desde **1998‑01‑01**. | **Sí.** Rachas secas. |
| **MERRA‑2** (`T2M_MAX`) | Temperatura máxima diaria, rejilla de unos 50 km, desde 1981. | **Sí.** Episodios de calor (dato regional). |
| **MERRA‑2** (`PRECTOTCORR`) | Lluvia corregida desde 1981, rejilla de unos 50 km. | No: se usa una sola fuente de lluvia (IMERG). |
| **INEGI** | Edafología 1:250 000; catálogo de municipios (AGEEML). | Suelos predominantes por zona y lista de municipios. |
| **FAO GAEZ** | Aptitud de cultivos y restricciones de suelo, global. | Referencia para `reglas.suelos[].aptitud`. |
| **SIAP / DGSIAP** | Producción por municipio, cultivo y modalidad. | Plausibilidad de las estrategias. |
| **SMAP L4, Sentinel‑2/MODIS, GRACE, ERA5** | Humedad del suelo, vegetación y suelo desnudo, agua subterránea, reanálisis. | Extras si sobra tiempo. |
| **USDA (SSURGO, WSS, CDL), PRISM** | Suelo, cultivos y clima con alto detalle. | **No aplican**: solo cubren EE. UU. |

**Respuesta de NASA POWER:**
- La serie está en `properties.parameter.<PARAM>` con claves `YYYYMMDD`; las unidades en `parameters.<PARAM>.units`.
- El valor faltante está en `header.fill_value` (`-999.0`). **Se convierte a `null`. Nunca cuenta como 0 mm de lluvia.**

## 4. La península en datos (verificado el 2026‑11‑14)

Resultado de `data-pipeline/clima.py` con GPM IMERG, 1998–2025 (28 temporadas completas en todas las zonas). La ventana de resumen es del 1 de junio al 31 de agosto y un día seco tiene menos de 1 mm.

| Zona | Lluvia anual (mediana) | Lluvia jun–ago (mediana) | Racha seca más larga jun–ago (mediana) | Peores años (días) |
|---|---:|---:|---:|---|
| Noroeste de Yucatán | 1109 mm | 522 mm | 7 días | 1998 (18), 2025 (12), 2014 (11) |
| Oriente de Yucatán | 1322 mm | 567 mm | 8.5 días | 1998 (17), 2010 (15), 2001 (12) |
| Sur de Yucatán y Puuc | 1133 mm | 522 mm | 7 días | 2014 (19), 1998 (17), 2019 (11) |
| Los Chenes, Campeche | 1179 mm | 537 mm | 6.5 días | 1998 (19), 2014 (14), 2025 (12) |
| Sur de Campeche | 1488 mm | 765 mm | 5 días | 2023 (16), 1998 (10), 2014 (9) |
| Zona maya de Quintana Roo | 1344 mm | 482 mm | **10 días** | 2015 (17), 2018 (17), 2022 (17) |
| Sur de Quintana Roo | 1330 mm | 501 mm | **9.5 días** | 2019 (23), 1998 (19), 2015 (18) |

**Hallazgos para el pitch:**

1. **El total de lluvia engaña.** En el noroeste de Yucatán, 2022 y 2025 tuvieron casi la misma lluvia de junio a agosto (488 mm contra 469 mm), pero en 2025 la racha seca duró 12 días contra 5.
2. **Más lluvia al año no significa menos sequía en verano.** Quintana Roo llueve más al año que el noroeste de Yucatán, pero tiene las rachas secas de verano más largas de la península (mediana de 10 días contra 7).
3. **Dónde siembras importa más que cuándo siembras.** En un cálculo exploratorio con las reglas provisionales y suelo *k'ankab*, la proporción de días críticos del maíz dentro de una racha seca va de **5 %** (sur de Campeche) a **28 %** (Quintana Roo); en suelo *tsek'el* sube a 9 % y 34 %. En cambio, mover la siembra dos semanas casi no la cambia (10 % contra 11 % en el noroeste).
4. **El calor pega al sembrar, no al florecer.** Según MERRA‑2, en el noroeste de Yucatán hay una mediana de 24 días de 35 °C o más en mayo y casi ninguno en agosto. El riesgo de calor se concentra en el establecimiento de junio.
5. **La prioridad cambia la recomendación.** Con prioridad en el agua empatan cobertura y milpa; con suelo o nitrógeno gana la cobertura; con ingreso empatan milpa y relevo. Esto se repite en las 7 zonas: **la zona no cambia tanto qué estrategia gana, sino cuánto riesgo de sequía tiene cada una**. En el sur de Quintana Roo, con prioridad en el agua, hasta el relevo queda empatado con las mejores, porque allí todas las opciones sufren la sequía de verano.

> Los hallazgos 3 y 5 dependen de reglas provisionales (umbrales, etapas, atributos) que el Rol 3 debe confirmar. Se presentan como exploración, no como recomendación agronómica.

## 5. Roles

| # | Rol | Archivo | Entregable del día |
|---|---|---|---|
| 1 | Líder técnico e integración | `roles/1-lider-tecnico-e-integracion.md` | Contrato v0.2 con ejemplos falsos en la primera hora, flujo completo, PWA publicada en HTTPS y decisión de qué recortar |
| 2 | Ingeniería de datos | `roles/2-ingenieria-de-datos.md` | `zonas.json` (puntos) y `clima/<zona>.json` para cada zona, con lluvia, calor, rachas y resumen |
| 3 | Reglas agrícolas | `roles/3-reglas-agricolas.md` | `planes.json` (4 estrategias con beneficios y riesgos) y `reglas.json` (cultivos, suelos, pesos), cada valor con fuente o «por confirmar» |
| 4 | Motor y PWA sin conexión | `roles/4-motor-y-pwa-sin-conexion.md` | `comparar()`, instalación, funcionamiento sin conexión y parcela guardada en el teléfono |
| 5 | Frontend y captura | `roles/5-frontend-y-captura.md` | Pantalla «Mi parcela»: ubicación, asignación de zona, suelo y prioridad |
| 6 | Frontend y resultados | `roles/6-frontend-y-resultados.md` | Ranking de estrategias, «¿Por qué?», vista de la península y guion de la demo en modo avión |

### Dependencias entre roles

```
            contrato-datos.md v0.2 (Rol 1, hora 1)
           /         |           \          \
  Rol 2 zonas    Rol 3 planes    Rol 5 UI   Rol 6 UI
  y clima        y reglas          |          |
        \          /               |          |
       Rol 4 motor comparar() -----+----------+
                     |
           Rol 1 integra y publica la PWA
```

Todos trabajan desde el primer minuto con **datos falsos que respetan el contrato** y los cambian por los reales cuando estén listos.

## 6. Reglas de honestidad de datos (para todos)

- Todo dato inventado o de ejemplo lleva `"esEjemplo": true` o la etiqueta visible «dato de ejemplo».
- Siempre se muestran la fuente, el parámetro y la **fecha de corte** de cada dato de la NASA.
- El clima es de la **zona**, no de la parcela: siempre se muestran el nombre de la zona y la distancia al punto de datos.
- La app compara exposición histórica. **No predice cosechas ni garantiza resultados.**
- La app **apoya** la decisión; no reemplaza el juicio del productor ni el de un técnico. Lo dice en pantalla.
- Si falta un dato de campo, se dice qué falta en lugar de inventarlo.

## 7. Estructura del repositorio y propiedad de archivos

```
/app                         PWA estática (Roles 1, 4, 5, 6)
  index.html
  manifest.webmanifest
  sw.js
  /src/motor/comparar.js     motor (Rol 4)
  /src/datos.js              carga de JSON (Rol 4)
  /src/almacen.js            parcela en el teléfono (Rol 4)
  /src/ui/captura/           pantalla «Mi parcela» (Rol 5)
  /src/ui/resultados/        estrategias, «¿Por qué?» y península (Rol 6)
  /data/zonas.json           zonas de la península (Roles 2 y 3)
  /data/clima/<zona>.json    salida del pipeline (Rol 2)
  /data/planes.json          estrategias (Rol 3)
  /data/reglas.json          reglas agrícolas y suelos (Rol 3)
  /data/municipios.json      catálogo para captura (Rol 5)
  /data/parcela-ejemplo.json (Roles 1 y 5)
  /fixtures/                 JSON de ejemplo, incluida salida-ejemplo.json
/data-pipeline               preparación de datos con Python (Rol 2)
  clima.py                   descarga NASA POWER por zona y exporta clima/<zona>.json
  /raw/                      respuestas originales de NASA para reproducir cálculos
/docs                        estos documentos
  reto-oficial.md            texto oficial del reto
  contrato-datos.md          formatos compartidos (Rol 1)
  requisitos-y-modelo.md     requisitos verificables y modelo conceptual
  guia-de-trabajo.md         acuerdos del equipo
  /diagramas/                arquitectura y clases
```
