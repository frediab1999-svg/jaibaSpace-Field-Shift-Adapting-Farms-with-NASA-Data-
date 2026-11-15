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
| [Look & feel](docs/look-and-feel.md) | Guía visual, tono, componentes y accesibilidad de la PWA. |
| [Contrato frontend ↔ backend](docs/contrato-frontend-backend.md) | Endpoints que usa la PWA, entidades y brechas en ambos sentidos. |
| [Datos publicados del MVP](docs/entrega-datos-mvp.md) | Zonas, puntos, archivos de clima, qué se puede calcular y cómo auditarlos. |
| [Reglas agrícolas y fuentes](docs/rol-3-fuentes-y-rotaciones.md) | Planes, reglas, suelos y fuentes para Tekax. |
| [Declaración de uso de IA](docs/declaracion-uso-ia.md) | Qué partes de la entrega se hicieron con IA. |
| [Decisiones](docs/decisiones/) | Decisiones de arquitectura versionadas. |

## Evolución de la documentación

Se retiraron los documentos de implementación v0.2 centrados en maíz para evitar confundirlos con la nueva arquitectura multicultivo. Los contratos que ya están implementados se describen en el contrato frontend ↔ backend y en la decisión 0002; los esquemas de `shared/schemas/` siguen siendo propuestas del prototipo.

## Estructura principal

```text
app/             PWA JavaScript, interfaz, almacenamiento local y sincronización
server/          API FastAPI, módulos de dominio y migraciones PostgreSQL/PostGIS
data-pipeline/   Ingesta y preparación de clima, escenarios y catálogos
shared/          Esquemas y datos de ejemplo compartidos
docs/            Contexto, requisitos, arquitectura y diagramas
```

La estructura detallada está en [arquitectura-y-estructura.md](docs/arquitectura-y-estructura.md). El árbol se irá materializando por fases; las fuentes de proyecciones y semillas y otras decisiones pendientes se documentan en [requisitos-del-sistema.md](docs/requisitos-del-sistema.md).

## Arranque rápido (primera versión funcional)

```bash
# Servidor: PostgreSQL/PostGIS + FastAPI (ver server/README.md)
cd server
cp .env.example .env            # cambia POSTGRES_PASSWORD
docker compose up --build -d
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed

# PWA (ver app/README.md)
cd ../app
npm install
npm run dev                     # http://localhost:5173
```

Recorrido: **Tus parcelas → Ver con parcelas de ejemplo → Milpa del cenote → ¿Qué siembro el próximo ciclo?**. La PWA descarga de FastAPI las zonas, el clima, los planes, las reglas y los catálogos, los guarda en el teléfono y calcula ahí la comparación de tres opciones. Después de la primera carga funciona sin conexión. Sin el servidor, la app abre con la copia local de los datos.

Pruebas: `npm test` en `app/` y `python -m pytest` en `server/`. Auditoría de datos: `python data-pipeline/auditar_datos.py app/data`.

El piloto agrícola es **Tekax, Sur de Yucatán** (`yuc-sur`). El clima regional también está publicado para Los Chenes (Campeche) y la Zona maya (Quintana Roo).

## Pipeline climático

`data-pipeline/clima.py` descarga y prepara el clima histórico de NASA POWER por zona, y `data-pipeline/auditar_datos.py` comprueba los archivos publicados. Consulta [data-pipeline/README.md](data-pipeline/README.md) y [docs/entrega-datos-mvp.md](docs/entrega-datos-mvp.md).
