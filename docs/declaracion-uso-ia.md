# Declaración de uso de IA

Estado al **2026-11-15**. El repositorio no trae un formato del concurso para esta declaración, así que queda en este documento. Solo se atribuye lo que se puede comprobar en el repositorio o en el registro de la sesión de trabajo. Lo que no se pudo comprobar se dice así.

## Primera versión funcional (cambios sobre `develop` `89f5fca`)

**Herramienta: Claude Code (Fable).** El modelo de la sesión fue Fable 5.2 (`claude-fable-5-2`). Trabajó directamente sobre el repositorio, a partir de un encargo escrito que entregó un integrante del equipo. Una persona del equipo debe revisar el resultado antes de fusionarlo.

| Área | Qué hizo la IA |
|---|---|
| **Backend** | Modelos y migración `0002_published_content` (documentos publicados, zonas con punto PostGIS, índice de clima, perfil y parcelas de demo). Carga idempotente `python -m app.seed`. Rutas `/bundle`, `/climate/zones`, `/climate/datasets…`, `/strategies/plans`, `/strategies/rules`, `/catalogs/{nombre}` y `/demo`. `/ready` con comprobación de esquema y contenido. CORS para la red local, opción de servir la PWA y montaje de datos en Docker Compose. |
| **Frontend** | Descarga, validación y guardado del paquete de datos (`services/contenido.js`, `shared/datos.js`, IndexedDB). Reescritura de la pantalla «Opciones para tu parcela» sobre el diseño existente. Franja de 24 meses con ventana móvil. Demo desde el servidor. Corrección de las referencias a la zona de Umán que el cambio a Tekax dejó rotas (calendario, predicción, semillas, formulario de parcela). |
| **Motor** | `motor/estrategias.js` y `motor/comparacion.js`: planes con varios cultivos por ciclo, meses con cultivo en pie, exposición histórica por etapa, años evaluables, «Sin estimación», práctica registrada o plantilla, y escenario de fecha de siembra. |
| **Datos** | Auditoría `data-pipeline/auditar_datos.py` y su ejecución contra una descarga fresca de NASA POWER. Plan `milpa-canavalia` y formato 0.4 de `planes.json`. Correspondencia municipio–zona de tres municipios, estado de equivalencia de suelos, corrección de valores obsoletos del catálogo de semillas y reubicación de la parcela de demo en Tekax. |
| **Pruebas** | Frontend: 26 pruebas nuevas (24 en `app/tests/estrategias.test.js` y 2 en `motor.test.js`) y el ajuste de una existente que dependía del archivo de Umán. Servidor: 15 pruebas nuevas sin base de datos, 3 de integración contra PostgreSQL/PostGIS y la corrección de una prueba de estadísticas que ya fallaba. Verificación de extremo a extremo en un navegador sin ventana. |
| **Documentación** | Decisión `0002`, `server/README.md`, `app/README.md`, `README.md`, `data-pipeline/README.md`, `docs/entrega-datos-mvp.md`, la actualización de `docs/contrato-frontend-backend.md`, la adenda de `docs/rol-3-fuentes-y-rotaciones.md` y este documento. |

**Lo que la IA no hizo en esta entrega:**

- No generó ni modificó imágenes, íconos ni fuentes tipográficas.
- No cambió el diseño visual, la navegación ni los recursos del frontend.
- No decidió la zona piloto ni las reglas agrícolas: usó `zonas.json`, `reglas.json` y los planes que publicó el equipo. La única adición agrícola es el plan `milpa-canavalia`, marcado como escenario ilustrativo y pendiente de revisión del Rol 3.
- No probó la app en un teléfono. La verificación fue en Microsoft Edge sin ventana, en Windows 11, con tamaño de pantalla de celular.

**Fuentes consultadas por la IA en línea.** Para revisar los supuestos de la canavalia intercalada se hicieron tres búsquedas web. Solo se leyeron los resúmenes que devolvió el buscador, no los artículos completos. Están citadas como F24, F25 y F26 en `docs/rol-3-fuentes-y-rotaciones.md`, con ese límite declarado.

## Trabajo anterior en el repositorio

| Parte | Uso de IA | Cómo se sabe |
|---|---|---|
| Documentación base y auditoría de datos de la rama `docs/base_inicial_info` (PR #1, #3, #5 y #6) | Claude Code, con los modelos Opus 5.5 y Sonnet 5.5 | Registro de la misma sesión de trabajo |
| Archivos de clima y zonas de la entrega de datos (PR #5) | Los generó un integrante con el pipeline del repositorio y los entregó a través de ChatGPT; Claude Code los verificó contra NASA | Lo indicó el integrante; la verificación está en el registro de la sesión |
| Imágenes de `app/src/assets/img` (`fondo-milpa.jpg`, `bordado.webp`, `mapa-peninsula.webp`, `semilla-*.jpg`, `foto-*.jpg`, `ico-*.jpg`, `letrero-*.webp`) | **Generadas con Gemini** por el equipo, recortadas y optimizadas para web | `docs/look-and-feel.md`, sección de recursos. En esta entrega solo se reutilizaron, sin modificarlas |
| Imágenes `nodo-*.webp` y los íconos de `app/public/icons` | No comprobado | No están en la lista de `docs/look-and-feel.md`. Debe declararlo quien las agregó (PR #10) |
| Prototipo de la PWA (PR #10), reglas y planes agrícolas (PR #7 y #11), servidor inicial (PR #2 y #4) | No comprobado | Los hicieron otros integrantes. Si usaron IA, deben declararlo ellos |
| Fuentes tipográficas y Leaflet | No son de IA | Licencias OFL y BSD-2, según `app/README.md` y `docs/look-and-feel.md` |

## Datos que no son de IA

El clima viene de NASA POWER (GPM IMERG y MERRA-2). Las reglas y los planes citan INIFAP, INEGI, SADER/DGSIAP, FAO y USDA. Ningún valor climático o agrícola fue inventado por un modelo: los números de la pantalla se calculan con esos archivos, y las pruebas reproducen los resultados publicados por el Rol 3.
