# Requisitos y modelo conceptual — Field Shift (Península de Yucatán)

## Propósito y estado

Este documento convierte el [reto oficial](reto-oficial.md), los roles y el contrato de datos v0.2 en requisitos verificables para el MVP. El contrato de `docs/contrato-datos.md` sigue siendo la fuente de verdad para los nombres y tipos de los JSON.

Los umbrales, etapas, ajustes de suelo, atributos y pesos de `reglas.json` y `planes.json` son **propuestas** hasta que el Rol 3 los respalde con fuentes. Los requisitos que dependen de esos valores se actualizan si cambia el contrato.

## Arquitectura acordada para el MVP

La solución es una **PWA cliente con hosting estático**, sin backend:

```text
NASA POWER ──(Python, Rol 2, antes del despliegue)──> clima/<zona>.json  (7 zonas)
Roles 2 y 3 ─────────────────────────────────────────> zonas.json
Rol 3 ───────────────────────────────────────────────> planes.json, reglas.json
                                                            │
                                                            v
Hosting HTTPS ──(PWA y JSON)──> Teléfono: PWA ── service worker ── caché offline
                                     │
                                     └── motor comparar() + parcela en almacenamiento local
```

El navegador descarga la PWA y los archivos estáticos una vez. Después, todo corre en el teléfono: no hay un servidor que reciba parcelas ni que calcule la comparación, y no se consulta ningún servicio externo en tiempo de uso.

## Actores

| Actor | Objetivo |
|---|---|
| Productor de temporal de la península | Indicar su parcela, suelo y prioridad, y entender qué estrategia le conviene y por qué. |
| Técnico o asesor agrícola | Revisar la evidencia, los riesgos y lo que falta confirmar antes de recomendar un cambio. |
| Integrante que prepara datos (Roles 2 y 3) | Entregar archivos JSON válidos según el contrato. |
| Equipo de desarrollo (Roles 1, 4, 5 y 6) | Integrar, probar y publicar la PWA. |

## Requisitos funcionales

| ID | Requisito | Criterio de aceptación | Rol principal |
|---|---|---|---|
| RF-01 | La PWA debe permitir cargar la parcela de ejemplo y mostrar que es un dato de ejemplo. | Al cargar el caso inicial, la parcela tiene `esEjemplo: true` y la interfaz muestra «Dato de ejemplo». | 5 |
| RF-02 | La PWA debe permitir indicar la ubicación por GPS o eligiendo un municipio de Yucatán, Campeche o Quintana Roo. | Si el GPS no está disponible o se deniega el permiso, se puede continuar con la lista. El origen queda como `gps` o `lista`. | 5 |
| RF-03 | La PWA debe asignar la zona agroclimática más cercana y mostrar la distancia al punto de datos. | `zonaId` es la zona con el punto más cercano (Haversine). La interfaz muestra el nombre de la zona y la distancia, y aclara que el clima describe la región, no la parcela. | 5 |
| RF-04 | La PWA debe permitir elegir el tipo de suelo local o «no sé». | Las opciones vienen de `reglas.suelos`; las predominantes de la zona aparecen primero. «No sé» envía `null` y el motor usa el umbral general y lo marca como pendiente. | 5 |
| RF-05 | La PWA debe permitir elegir una prioridad. | La prioridad es una clave de `reglas.prioridades` (`agua`, `suelo`, `nitrogeno`, `ingreso`). No se puede comparar sin elegir una. | 5 |
| RF-06 | La captura debe producir una entrada que respete la sección 6 del contrato. | La entrada contiene `version`, `parcela` (con `zonaId` y `distanciaZonaKm`), `prioridad` y al menos 3 planes, incluido `actual`. Los campos desconocidos quedan en `null`. | 5 |
| RF-07 | La aplicación debe cargar y validar `zonas.json`, el clima de la zona, los planes y las reglas antes de comparar. | El motor recibe `{ clima, planes, reglas }` ya cargados. Un archivo faltante o inválido se muestra como error, no como resultado. | 4 |
| RF-08 | El motor debe ser una función JavaScript pura y síncrona. | Con la misma entrada y los mismos datos, el resultado es el mismo; la función no hace solicitudes de red ni accede al DOM. | 4 |
| RF-09 | El motor debe comparar **al menos 3 estrategias**, incluida la actual. | La salida contiene un resultado por cada id de `entrada.planes`. Con menos de 3 o sin `actual`, lanza un error. | 4 |
| RF-10 | El motor debe evaluar los 5 criterios: rachas secas, estrés por calor, cobertura del suelo, fijación de nitrógeno e ingreso o forraje. | Cada criterio trae valor, puntaje y explicación según la sección 7 del contrato. Solo se usan temporadas completas. | 4 |
| RF-11 | El tipo de suelo debe influir en el cálculo. | El umbral de racha seca usa `ajusteRachaDias` del suelo elegido; los cultivos con aptitud baja en ese suelo aparecen como riesgo. | 4 |
| RF-12 | El motor debe ordenar las estrategias y declarar recomendadas o empate. | `ranking` va de mayor a menor puntaje; `recomendados` contiene todas las estrategias dentro de `toleranciaEmpate.total` del primer lugar. | 4 |
| RF-13 | Para cada estrategia, la pantalla debe mostrar por qué se sugiere, la evidencia, los beneficios, los vacíos de información y los riesgos. | Se ven `porQue`, `datosNasa` y `evidencia`, `beneficios`, `faltaConfirmar` y `riesgos` de cada plan. | 6 |
| RF-14 | La pantalla debe mostrar cuándo el suelo queda desnudo y cuándo el cultivo es vulnerable. | Calendario de 12 meses por estrategia, con meses descubiertos y etapas críticas marcadas. | 6 |
| RF-15 | La pantalla debe mostrar la procedencia y las limitaciones de los datos. | Se ven fuente, parámetro, resolución y fecha de corte de la lluvia y de la temperatura; la zona usada; y los avisos. | 6 |
| RF-16 | La pantalla debe mostrar cómo se compara la zona del productor con el resto de la península. | Se ven, por zona, la lluvia de junio a agosto y la mediana de la racha seca más larga, a partir de `clima/*.json → resumen`. | 6 |
| RF-17 | La pantalla debe explicar los términos técnicos. | Hay una ayuda «¿Qué significa?» para racha seca, días críticos, IMERG, MERRA‑2 y la diferencia entre dato satelital y medición en campo. | 6 |
| RF-18 | La aplicación debe guardar y recuperar la parcela localmente. | Al reabrir en el mismo dispositivo se restauran los campos guardados. Si falla el almacenamiento, se continúa con el ejemplo. | 4 |
| RF-19 | La PWA debe poder instalarse y ofrecer instrucciones donde no hay aviso de instalación. | En navegadores compatibles aparece «Instalar»; en iOS se muestran instrucciones para agregarla a inicio. | 4 |
| RF-20 | Tras una primera carga con conexión, la aplicación debe funcionar sin conexión. | En modo avión se abre la PWA, se elige cualquier zona disponible, se comparan las estrategias y se ven los resultados. | 4 |
| RF-21 | El equipo debe poder sustituir datos de ejemplo por datos reales sin cambiar interfaces. | Los datos reales pasan las mismas validaciones y reemplazan a los de ejemplo sin cambiar la firma ni la estructura de entrada y salida. | 1, 2, 3, 4 |

## Requisitos no funcionales

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RNF-01 — Offline | La PWA y todos los JSON (las 7 zonas, unos 850 KB) están en caché tras la primera visita. | Se completa el flujo RF-20 en modo avión. |
| RNF-02 — Conectividad segura | El sitio publicado usa HTTPS. | La URL carga por HTTPS y el navegador permite *service worker* y geolocalización. |
| RNF-03 — Dispositivo móvil | La interfaz prioriza teléfonos. | Las 4 estrategias se pueden revisar a 360 px de ancho (tarjetas apiladas o pestañas). |
| RNF-04 — Accesibilidad | La interfaz es operable y comprensible sin depender solo del color. | Campos con etiqueta, radios reales, controles táctiles de 44 px o más, texto en `es-MX`, insignias con texto («Mejor», «Empate»). |
| RNF-05 — Privacidad | La parcela no sale del teléfono. | No hay solicitudes de red con datos de la parcela. |
| RNF-06 — Calidad de datos | Los archivos respetan el contrato y hacen explícitos faltantes y ejemplos. | Faltantes como `null`, nunca `-999` ni 0; datos inventados con `esEjemplo: true`. |
| RNF-07 — Trazabilidad | Cada número se puede rastrear a su fuente y fecha. | La interfaz muestra fuente, parámetro, resolución y fecha de corte; `data-pipeline/raw/` guarda las respuestas originales. |
| RNF-08 — Honestidad | La interfaz no presenta la comparación como pronóstico ni como recomendación segura. | El aviso de exposición histórica y el de «apoya, no reemplaza» permanecen visibles. |
| RNF-09 — Representatividad espacial | El clima de zona no se presenta como clima de la parcela. | Siempre se ven la zona y la distancia; la resolución de MERRA‑2 (unos 50 km) se aclara junto al dato de calor. |
| RNF-10 — Mantenibilidad | Los roles trabajan con archivos y formatos estables. | Los cambios de campos o tipos requieren aprobación del Rol 1, nueva versión del contrato y aviso a los roles afectados. |
| RNF-11 — Resiliencia | Los fallos de GPS o almacenamiento no bloquean el caso de ejemplo. | Se puede seguir con la lista si falla el GPS y con el ejemplo si falla el almacenamiento. |
| RNF-12 — Veracidad de resultados | Los números provienen de la salida del motor. | La UI pinta valores de la salida; no inventa ni duplica cifras. |
| RNF-13 — Reproducibilidad | Los datos se pueden regenerar. | `python data-pipeline/clima.py app/data` vuelve a producir los archivos de clima, y `yuc-noroeste` reproduce la tabla de referencia del Rol 2. |

## Entidades del dominio

Entidades conceptuales; no son tablas de base de datos. En el MVP viven en JSON, objetos JavaScript o almacenamiento local.

| Entidad | Atributos principales | Relaciones y ubicación |
|---|---|---|
| **Parcela** | `id`, `nombre`, `esEjemplo`, `modalidad`, `cultivoActual`, ciclo anterior | Tiene una ubicación y un suelo; se guarda localmente. |
| **Ubicación** | `lat`, `lon`, `municipio`, `estado`, `origen`, `zonaId`, `distanciaZonaKm` | Pertenece a una parcela y se asigna a una zona. |
| **Zona agroclimática** | `id`, `nombre`, `estado`, punto, `suelosPredominantes` | Definida en `zonas.json`; tiene un conjunto climático. |
| **Tipo de suelo** | `id`, `nombre`, `equivalenteWRB`, `ajusteRachaDias`, aptitud por cultivo | Definido en `reglas.suelos`; lo elige el productor para su parcela. |
| **Prioridad** | `agua`, `suelo`, `nitrogeno` o `ingreso` | Determina los pesos de los criterios. |
| **Estrategia (plan)** | `id`, `nombre`, ciclos, `atributos`, `beneficios`, `riesgos`, `fuentes`, `porConfirmar` | El MVP compara `actual`, `cobertura`, `milpa` y `relevo`. |
| **Ciclo de cultivo** | `cultivo`, siembra, cosecha, `proposito` | Pertenece a una estrategia y refiere a un cultivo. |
| **Cultivo y etapa** | etapas con `desdeDia`, `hastaDia`, `sensibilidad` | En `reglas.cultivos`; las etapas de sensibilidad alta definen los días críticos. |
| **Conjunto climático** | zona, ubicación, fuentes, definiciones, temporadas, resumen | Un archivo por zona (`clima/<zona>.json`). |
| **Temporada** | `anio`, `completa`, días con dato, ventana | Contiene rachas secas y episodios de calor. |
| **Racha seca** | inicio, fin, días | Días consecutivos con menos de 1 mm. |
| **Episodio de calor** | inicio, fin, días | Días consecutivos con `T2M_MAX` de 35 °C o más. |
| **Reglas agrícolas** | umbrales, cultivos, suelos, cobertura, niveles, prioridades, pesos, tolerancias | Configuran el algoritmo; vienen de `reglas.json`. |
| **Comparación** | prioridad, pesos, zona, suelo, ranking, recomendados, mensaje, avisos | Resultado de `comparar()`. |
| **Resultado por estrategia** | calendario, criterios, puntaje, posición, por qué, beneficios, riesgos, datos NASA, falta confirmar | Uno por estrategia comparada. |
| **Criterio evaluado** | valor, puntaje, explicación, evidencia | 5 por estrategia. |
| **Fuente de datos** | nombre, producto, parámetro, resolución, URL, fecha de descarga y de corte | Una para lluvia y otra para temperatura. |

### Relaciones principales

```text
Parcela ── tiene ──> Ubicación ── asignada a ──> Zona agroclimática ── tiene ──> Conjunto climático
Parcela ── tiene ──> Tipo de suelo
Comparación ── usa ──> Parcela + Prioridad + Estrategias (3 o más) + Conjunto climático + Reglas
Estrategia ── contiene ──> Ciclos ── refieren a ──> Cultivos/Etapas
Temporada ── contiene ──> Rachas secas + Episodios de calor
Resultado por estrategia ── contiene ──> 5 Criterios + Evidencia + Beneficios + Riesgos + Datos pendientes
Conjunto climático ── identifica ──> Fuentes de datos (lluvia, temperatura)
```

## Fuera del alcance del MVP

- Backend, cuentas de usuario o base de datos central.
- Pronóstico meteorológico (el reto no lo pide).
- Pronosticar rendimientos o emitir recomendaciones agronómicas concluyentes.
- Clima por parcela (el MVP usa clima por zona).
- SMAP, NDVI, GRACE, mercado y precios en tiempo real (extras si sobra tiempo).
- Que el productor edite parámetros agrícolas o cree estrategias propias.

## Decisiones que requieren confirmación del equipo

- Congelar el contrato v0.2 y los valores agrícolas provisionales con sus fuentes.
- Confirmar las 7 zonas y sus puntos representativos, o reducir a una por estado.
- Confirmar los suelos predominantes por zona con INEGI.
- Confirmar con fuentes la sensibilidad alta del establecimiento del maíz y el umbral de calor de 35 °C.
- Confirmar los atributos (nitrógeno, ingreso o forraje) de cada estrategia.
- Acordar quién revisa y acepta cada cambio de contrato antes de integrarlo a `develop`.
