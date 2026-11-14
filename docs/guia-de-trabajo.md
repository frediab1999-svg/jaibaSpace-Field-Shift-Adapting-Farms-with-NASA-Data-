# Guía de trabajo del equipo

Este documento fija el camino del MVP para que cada integrante pueda avanzar en paralelo sin cambiar el producto ni romper la integración. Si algo no está claro, se consulta al Rol 1 antes de crear otro flujo o formato.

Los requisitos verificables y las entidades están en `docs/requisitos-y-modelo.md`; el texto oficial del reto, en `docs/reto-oficial.md`.

## Producto que vamos a construir

Una aplicación web instalable en el teléfono (PWA), en español, para que un productor de temporal de la **Península de Yucatán** indique su parcela, su suelo y su prioridad, y explore **tres estrategias de dos ciclos**: la actual (maíz → maíz) y dos rotaciones (canavalia → maíz y frijol caupí → maíz), con explicaciones basadas en 28 años de datos de la NASA de su zona. Funciona sin conexión.

El MVP no es una plataforma agrícola completa: no predice cosechas, no garantiza resultados y no reemplaza el juicio del productor.

## Camino técnico

> **Arquitectura PENDIENTE (2026‑11‑14).** El equipo va a cambiar la arquitectura. Lo que este documento dice sobre PWA, backend o falta de backend, motor en el teléfono, *service worker*, hosting, almacenamiento local o modo sin conexión es la **propuesta anterior** y **no está decidido**. No lo implementes ni lo des por hecho hasta que el Rol 1 publique la nueva arquitectura. Ver `docs/00-contexto-general.md`, sección «Arquitectura (pendiente)».

1. El Rol 2 genera con Python `clima/<zona>.json` para cada zona de `zonas.json` (lluvia IMERG y temperatura MERRA‑2 vía NASA POWER).
2. El Rol 3 entrega `planes.json` (las 3 estrategias de la sección 3 del contrato v0.3, con objetivo, beneficios y riesgos) y `reglas.json` (cultivos, suelos, prioridades y pesos), cada valor con fuente o en `porConfirmar`.
3. El Rol 4 implementa el motor, la carga de datos, el almacenamiento local y la PWA offline.
4. El Rol 5 construye la captura: ubicación, asignación de zona, suelo y prioridad.
5. El Rol 6 muestra el ranking de estrategias, el «¿Por qué?» de cada una y la vista de la península.
6. El Rol 1 aprueba los contratos, integra y verifica el flujo online y offline.

**Arquitectura pendiente:** si hay backend, dónde corre la comparación y si funciona sin conexión lo decide el Rol 1. No se agrega otra fuente de datos sin su aprobación y sin actualizar esta guía.

## Responsabilidades y archivos principales

| Rol | Área principal | Entrega compartida |
|---|---|---|
| 1. Líder técnico e integración | `docs/`, estructura e integración | Aprueba contratos y cambios de arquitectura |
| 2. Ingeniería de datos | `data-pipeline/`, `app/data/clima/` | `zonas.json` (puntos) y un archivo de clima por zona |
| 3. Reglas agrícolas | `app/data/planes.json`, `app/data/reglas.json` | Estrategias, cultivos, suelos, pesos y sus fuentes |
| 4. Motor y PWA | `app/src/motor/`, `app/src/datos.js`, `app/src/almacen.js`, `sw.js` | Comparación local y funcionamiento offline |
| 5. Frontend y captura | `app/src/ui/captura/`, `app/data/municipios.json` | Entrada contractual con zona y suelo |
| 6. Frontend y resultados | `app/src/ui/resultados/` | Ranking, explicaciones, vista de península y guion de la demo |

Los ejemplos compartidos viven en `app/data/` y `app/fixtures/`. Si un archivo o una responsabilidad no aparece aquí, coordina con el Rol 1 antes de editar el trabajo de otro rol.

## Reglas para evitar cambios incompatibles

- `docs/contrato-datos.md` es la fuente de verdad para nombres, tipos y estructura de los JSON.
- No cambies claves, tipos o significado de campos por tu cuenta. Propón el cambio al Rol 1; si se aprueba, se sube la versión del contrato y se avisa a los roles afectados.
- Mientras una entrega real no esté lista, usa datos de ejemplo que respeten el contrato y márcalos como ejemplo.
- No pongas lógica de comparación en el procesamiento de datos; la comparación pertenece al motor JavaScript del Rol 4.
- Muestra siempre la zona, la distancia al punto de datos, la fuente y la fecha de corte.

## Integración

- Trabaja en tu rama de tarea y abre un pull request hacia `develop`; no integres directamente a `main`.
- En la descripción del pull request indica el rol, los archivos afectados, cómo probar el cambio y si modifica el contrato.
- Antes de pedir integración, valida que tus archivos siguen el contrato y que no cambiaste archivos de otro rol sin coordinarlo.
- Integra primero con ejemplos; sustituye los ejemplos por datos reales sin cambiar la interfaz compartida.
- `develop` reúne el trabajo del equipo, `QA` es para pruebas y `main` conserva la versión final.

## Qué hacer si aparece una idea nueva

Antes de implementarla, escribe brevemente qué problema del agricultor resuelve, qué archivos y roles afecta, y si cambia el contrato o el modo offline. El Rol 1 decide si entra al MVP o se deja para después. La prioridad es terminar el flujo existente, no sumar funciones.

Ideas ya evaluadas y dejadas para después: pronóstico meteorológico de 7 días, SMAP, NDVI de Sentinel‑2 o MODIS, GRACE y precios de mercado.
