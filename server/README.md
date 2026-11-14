# jaibaSpace Server

Servidor FastAPI para el prototipo multicultivo de jaibaSpace. Esta versión no tiene login ni cuentas. Recibe contribuciones seudónimas para estadísticas colectivas; el historial personal permanece en el dispositivo.

## Requisitos

- Python 3.12 o 3.13, según el rango de `pyproject.toml`.
- Docker y Docker Compose para el entorno local de desarrollo con API y PostgreSQL/PostGIS; o PostgreSQL/PostGIS instalado localmente.

## Configuración local con Docker Compose

1. Copia `.env.example` como `.env` y cambia `POSTGRES_PASSWORD` por un valor local.
2. Desde esta carpeta, ejecuta `docker compose up --build -d`.
3. Aplica el esquema inicial: `docker compose exec api alembic upgrade head`.
4. La API estará disponible en `http://localhost:8000`; la documentación interactiva, en `/docs`. La comprobación de vida es `/api/v1/health` y la disponibilidad de base de datos es `/api/v1/ready`.
5. Para detener los servicios, ejecuta `docker compose down`. Los datos de desarrollo permanecen en el volumen local `postgres_data`.

El puerto PostgreSQL del `docker-compose.yml` solo se publica en `127.0.0.1` para desarrollo local. Al preparar producción, debe usarse una red privada o un servicio gestionado y revisar la configuración de acceso; el comentario junto al puerto marca este cambio pendiente.

Las rutas de consentimiento, contribuciones y estadísticas tienen una implementación inicial. Las rutas de catálogos y conjuntos climáticos responderán con listas vacías mientras no se conecten sus fuentes. Las estadísticas agrupan resultados autorreportados por zona, cultivo y año, y se ocultan cuando la muestra es menor a `MIN_STATS_SAMPLE_SIZE` (10 por defecto; umbral provisional).

## Configuración sin Docker

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
```

Define `DATABASE_URL` y las demás variables de `.env.example` en el entorno. Para una base local, usa `localhost` como host. Aplica la migración y ejecuta la API con:

```text
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

La migración habilita la extensión PostGIS y crea las tablas de consentimiento y contribuciones. Aunque PostGIS ya está habilitado, todavía no hay una columna espacial ni almacenamiento de geometrías para parcelas.

## Principios del prototipo

- No hay endpoints de login ni de lectura de parcelas o historiales individuales.
- Las contribuciones se envían solo con autorización para uso estadístico.
- Los endpoints de estadísticas devuelven agregados por zona, cultivo y periodo.
- Un identificador de envío sirve para deduplicación; no autentica ni identifica una cuenta.
- Los datos del pipeline y los escenarios deben exponer fuente, periodo y versión.

Como no existe login, el prototipo registra la declaración de consentimiento enviada por el cliente, pero no puede vincularla a una identidad ni verificar quién la otorgó. La trazabilidad, revocación y retención de consentimientos requieren una decisión antes de un despliegue con usuarios reales.
