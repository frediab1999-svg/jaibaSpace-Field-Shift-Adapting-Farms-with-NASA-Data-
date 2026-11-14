# Requisitos del sistema jaibaSpace

## 1. Propósito y estado

Este documento define requisitos funcionales y no funcionales para la evolución multicultivo de jaibaSpace. Es coherente con [`contexto-general-proyecto.md`](contexto-general-proyecto.md) y [`arquitectura-y-estructura.md`](arquitectura-y-estructura.md). El contrato de datos v0.2 del caso inicial de maíz se retiró; se debe acordar un nuevo contrato antes de implementar las entidades y API.

El sistema apoya decisiones agrícolas de productores de temporal de la Península de Yucatán. Presenta observaciones históricas, escenarios climáticos y estadísticas descriptivas. No predice cosechas ni garantiza resultados.

## 2. Actores

| Actor | Necesidad |
|---|---|
| Productor de temporal | Registrar una parcela, explorar prácticas para un cultivo, consultar su historial y estadísticas de su zona. |
| Técnico o asesor agrícola | Revisar evidencia, supuestos, riesgos, cobertura de registros y escenarios. |
| Administrador de datos | Mantener catálogos, fuentes, versiones y calidad de los datos publicados. |
| Servicio de datos | Preparar y publicar datos climáticos, escenarios y catálogos públicos disponibles. |

## 3. Requisitos funcionales

| ID | Requisito | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-01 | La PWA permitirá registrar o seleccionar una parcela en la Península de Yucatán. | Se puede indicar ubicación por GPS o municipio; se muestra zona asignada y distancia o unidad geográfica usada. | MVP |
| RF-02 | La aplicación permitirá usarla con conectividad intermitente. | Tras descargar recursos, se abren pantallas y catálogos disponibles; nuevos registros se guardan localmente como pendientes. | MVP |
| RF-03 | El sistema permitirá seleccionar entre varios cultivos y variedades disponibles. | Las opciones provienen de catálogos versionados y muestran “sin dato” cuando un atributo no está disponible. | MVP |
| RF-04 | La aplicación permitirá comparar prácticas configuradas para el cultivo seleccionado. | Cada resultado muestra criterios, supuestos, beneficios, riesgos y datos faltantes; no depende de una lista fija solo para maíz. | MVP |
| RF-05 | El sistema permitirá consultar clima histórico para la zona. | Cada conjunto informa fuente, periodo, resolución, versión y fecha de actualización. | MVP |
| RF-06 | El sistema permitirá consultar proyecciones climáticas disponibles. | Cada escenario identifica fuente, escenario, periodo y resolución; se presenta como escenario y no como predicción de rendimiento. | Evolución |
| RF-07 | El productor podrá registrar una temporada agrícola mediante un cuestionario breve. | Puede registrar cultivo, variedad opcional, siembra/cosecha aproximadas, resultado cualitativo y causa percibida; cantidad y unidad son opcionales. | MVP |
| RF-08 | El productor podrá consultar su propio historial. | Solo se presentan registros asociados a su cuenta/dispositivo conforme a la política de acceso acordada. | MVP |
| RF-09 | El productor podrá sincronizar registros autorizados con el servidor. | La cola local muestra estado pendiente, sincronizado o error; reintentar no duplica registros. | MVP |
| RF-10 | El sistema permitirá autorizar el uso de registros para estadísticas colectivas. | La finalidad se explica antes de enviar; el estado de consentimiento se registra y se puede revisar. | MVP |
| RF-11 | Usuarios autorizados podrán consultar estadísticas colectivas por zona, cultivo y periodo. | Cada estadística muestra método, periodo y cantidad de registros incluidos; no revela una parcela individual. | MVP |
| RF-12 | El sistema podrá publicar catálogos básicos de semillas cuando haya fuente disponible. | Cada elemento incluye fuente, fecha de actualización y atributos conocidos; los vacíos permanecen explícitos. | Evolución |
| RF-13 | La interfaz ofrecerá español y maya. | El usuario puede elegir idioma; textos y audios publicados han sido revisados por hablantes competentes. | Evolución |
| RF-14 | La aplicación mostrará trazabilidad y límites de información. | Se identifican datos de ejemplo, valores faltantes, fuente y limitaciones; ningún dato desconocido se sustituye por cero. | MVP |
| RF-15 | El sistema permitirá preparar y publicar datos reproducibles mediante un pipeline. | Las ejecuciones conservan fuente, fecha, versión, validaciones y salida identificable. | MVP |

## 4. Requisitos no funcionales

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RNF-01 — Offline primero | La interfaz y datos descargados funcionan sin conexión. | Se pueden abrir la app, consultar datos en caché y guardar registros pendientes en el dispositivo. |
| RNF-02 — Sincronización segura | Los cambios se transmiten cuando hay conexión y autorización. | La API valida esquema y permiso; los errores no borran el registro local. |
| RNF-03 — Protección de datos | Los datos individuales y las estadísticas se separan por permisos y propósito. | Consultas individuales requieren autorización; las vistas colectivas solo devuelven datos agregados. |
| RNF-04 — Privacidad geográfica | La ubicación se usa según la finalidad informada. | El producto muestra cuándo usa ubicación precisa y usa zona/municipio para agregación pública. |
| RNF-05 — Calidad de agregados | No se publican grupos que permitan inferir registros individuales o que tengan cobertura insuficiente. | Se aplica un umbral mínimo configurable, definido antes de habilitar estadísticas públicas. |
| RNF-06 — Trazabilidad | Resultados climáticos y catálogos son auditables. | Cada conjunto identifica fuente, fecha, versión, escenario y transformaciones pertinentes. |
| RNF-07 — Incertidumbre | Escenarios y datos aportados no se comunican como certeza. | Se distingue observación, dato autorreportado, estadística y escenario climático. |
| RNF-08 — Interoperabilidad | PWA, API y pipeline usan contratos versionados. | Cambios incompatibles incrementan versión y mantienen validación de cliente/servidor. |
| RNF-09 — Multicultivo | La lógica agrícola no codifica únicamente el maíz. | Cultivos, variedades, etapas y prácticas se cargan de catálogos/reglas configurables. |
| RNF-10 — Accesibilidad y lenguaje | La interfaz se entiende en teléfono y no depende solo de color o tecnicismos. | Controles etiquetados, texto legible, lenguaje simple y etiquetas de estado explícitas. |
| RNF-11 — Disponibilidad gradual | La falta de API no bloquea las capacidades offline disponibles. | Fallos de red informan estado y conservan datos locales para reintento. |
| RNF-12 — Seguridad operativa | Secretos y credenciales no se guardan en el cliente ni en el repositorio. | Configuración sensible se inyecta al servidor y los ejemplos contienen solo valores ficticios. |

## 5. Arquitectura lógica

```text
PWA JavaScript ── IndexedDB y cola local ── sincronización ──> API FastAPI
      │                                                        │
      ├── comparación con datos descargados                     ├── validación y permisos
      ├── uso offline                                            ├── estadísticas agregadas
      └── idiomas y accesibilidad                                └── consultas de catálogos
                                                                   │
Pipeline Python ── datos versionados ───────────────────> PostgreSQL + PostGIS
```

La proyección climática puede requerir un pipeline y conjuntos de datos separados de la API transaccional. La fuente y los escenarios siguen pendientes de selección. No se asume un proveedor específico de semillas ni de datos estatales.

## 6. Datos principales

- Parcelas y geografía asignada.
- Cultivos, variedades, etapas y prácticas configurables.
- Historial de siembra y cosecha con campos opcionales y unidades locales.
- Consentimiento y finalidad de uso estadístico.
- Clima histórico y conjuntos de escenarios climáticos.
- Catálogos de semillas con fuente y actualización, cuando existan.
- Estadísticas agregadas por zona, cultivo y periodo, junto con método y tamaño de muestra.

## 7. Fuera del alcance inicial

- Predicción de rendimiento o garantía de cosecha.
- Recomendación agronómica automática como sustituto del productor o técnico.
- Integración con fuentes gubernamentales que aún no se hayan identificado y validado.
- Catálogo exhaustivo de semillas antes de confirmar disponibilidad y calidad de datos.
- Sincronización obligatoria para usar funciones locales de la PWA.

## 8. Decisiones pendientes antes de implementación

1. Fuente, escenario, resolución y periodo de las proyecciones climáticas.
2. Identidad/autenticación y reglas para recuperar historial en más de un dispositivo.
3. Retención, exportación y eliminación de registros de parcela/cosecha.
4. Umbral mínimo para publicar estadísticas por zona y cultivo.
5. Fuentes públicas concretas para semillas, variedades y datos territoriales.
6. Alcance y revisión comunitaria del maya, incluyendo selección de variante y audios.
7. Contrato API y modelo de base de datos versionado para el alcance multicultivo.

## 9. Trazabilidad con documentación relacionada

- Producto y alcance: [`contexto-general-proyecto.md`](contexto-general-proyecto.md).
- Arquitectura y carpetas: [`arquitectura-y-estructura.md`](arquitectura-y-estructura.md).
- Texto oficial del reto: [`reto-oficial.md`](reto-oficial.md).
- Diagramas actuales: [`diagramas/`](diagramas/).
