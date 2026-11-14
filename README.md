# jaibaSpace — Field Shift: Adapting Farms with NASA Data

jaibaSpace es una PWA para productores de temporal de la Península de Yucatán. El producto evoluciona del MVP inicial de maíz a una herramienta multicultivo que combina clima histórico, escenarios climáticos, información de semillas disponible y registros voluntarios de parcelas y cosechas.

La PWA está diseñada para trabajar sin conexión con datos previamente descargados. Cuando hay conexión, puede sincronizar registros autorizados con una API FastAPI y consultar estadísticas colectivas almacenadas en PostgreSQL/PostGIS.

El sistema presenta evidencia e incertidumbre; no predice rendimientos ni garantiza cosechas. Las estadísticas colectivas se muestran por zona y periodo, no como datos de parcelas individuales.

## Documentación vigente

| Documento | Contenido |
|---|---|
| [Contexto general del proyecto](docs/contexto-general-proyecto.md) | Producto, alcance geográfico, usuarios y principios. |
| [Arquitectura y estructura](docs/arquitectura-y-estructura.md) | Componentes, carpetas, entidades iniciales y orden sugerido. |
| [Requisitos del sistema](docs/requisitos-del-sistema.md) | Requisitos funcionales, de calidad y decisiones pendientes. |
| [Reto oficial](docs/reto-oficial.md) | Texto del reto NASA Space Apps Challenge. |
| [Diagramas](docs/diagramas/) | Casos de uso y modelo de dominio de la arquitectura multicultivo. |

## Evolución de la documentación

Se retiraron los documentos de implementación v0.2 centrados en maíz para evitar confundirlos con la nueva arquitectura multicultivo. El modelo de dominio y los contratos de la API deben definirse y versionarse antes de conectar cliente, servidor o base de datos.

## Estructura principal

```text
app/             PWA JavaScript, interfaz, almacenamiento local y sincronización
server/          API FastAPI, módulos de dominio y migraciones PostgreSQL/PostGIS
data-pipeline/   Ingesta y preparación de clima, escenarios y catálogos
shared/          Esquemas y datos de ejemplo compartidos
docs/            Contexto, requisitos, arquitectura y diagramas
```

La estructura detallada está en [arquitectura-y-estructura.md](docs/arquitectura-y-estructura.md). El árbol se irá materializando por fases; las fuentes de proyecciones y semillas y otras decisiones pendientes se documentan en [requisitos-del-sistema.md](docs/requisitos-del-sistema.md).

## Pipeline climático existente

`data-pipeline/clima.py` prepara los datos históricos NASA POWER del MVP v0.2. Su formato actual alimenta los ejemplos de maíz y deberá adaptarse al nuevo contrato versionado antes de conectarse a la API nueva. Consulta [data-pipeline/README.md](data-pipeline/README.md).
