# jaibaSpace Server

Servidor FastAPI de jaibaSpace. No tiene login ni cuentas. Hace tres cosas:

1. **Publica el contenido que usa la PWA:** zonas, clima histórico, planes, reglas y catálogos, con su huella SHA-256.
2. **Publica un perfil ficticio de demostración** con sus parcelas, para recorrer la app sin capturar nada.
3. **Recibe contribuciones seudónimas** para estadísticas colectivas, solo con consentimiento. El historial personal se queda en el dispositivo.

La comparación agrícola no se calcula aquí: la PWA descarga los datos y la calcula en el teléfono.

## Requisitos

- Docker Desktop con Docker Compose (camino recomendado), **o**
- Python 3.12 o 3.13 y un PostgreSQL con PostGIS propio.

## Arranque con Docker Compose (Windows, macOS o Linux)

Desde la carpeta `server/`:

```bash
cp .env.example .env                                 # en PowerShell: Copy-Item .env.example .env
# edita .env y cambia POSTGRES_PASSWORD (en las dos líneas donde aparece)
docker compose up --build -d                         # PostgreSQL/PostGIS + API
docker compose exec api alembic upgrade head         # crea el esquema (migraciones 0001 y 0002)
docker compose exec api python -m app.seed           # carga el contenido y la demo
```

Comprobación:

```bash
curl http://localhost:8000/api/v1/health    # {"status":"ok"}: la API responde
curl http://localhost:8000/api/v1/ready     # {"status":"ready","database":"ok","published_documents":11}
```

- La documentación interactiva está en `http://localhost:8000/docs`.
- `docker compose down` detiene los servicios y conserva los datos en el volumen `postgres_data`. Con `docker compose down -v` se borra la base y se puede repetir todo desde cero.
- Compose monta `../app/data` y `../app/fixtures` en modo de solo lectura: son la fuente de la carga. Si cambian, hay que volver a correr `python -m app.seed`.

### `/health` y `/ready`

| Ruta | Qué comprueba | Respuestas |
|---|---|---|
| `GET /api/v1/health` | Que el proceso responde. No toca la base. | `200 {"status":"ok"}` |
| `GET /api/v1/ready` | Que la base responde, el esquema está migrado y el contenido está cargado. | `200` listo · `503 database_unavailable` · `503 schema_not_migrated` · `503 content_not_loaded` |

## La carga de demo (`python -m app.seed`)

Lee los archivos publicados y los guarda en la base:

| Tabla | Qué guarda | Origen |
|---|---|---|
| `published_documents` | 11 documentos JSON con su cuerpo exacto, tamaño y SHA-256 | `app/data/*.json`, `app/data/clima/*.json`, `app/data/catalogos/*.json` |
| `zones` | 3 zonas con su punto de referencia en PostGIS (`POINT(longitud latitud)`, SRID 4326) | `zonas.json` |
| `climate_datasets` | Índice de los 3 conjuntos climáticos: fuente, parámetros, periodo, resolución, corte y versión | Cada archivo de clima |
| `demo_profiles` | 1 perfil ficticio, sin credenciales | `app/fixtures/ejemplo-milpa.json` |
| `demo_parcels` | 3 parcelas ficticias con sus temporadas y siembras de ejemplo | `app/fixtures/ejemplo-milpa.json` |

- **Es idempotente.** Cada fila se inserta o actualiza por su clave y lo que ya no está en los archivos se borra. Correrla dos veces deja lo mismo: la segunda vez informa `nuevas 0` en todas las tablas y la misma huella de paquete.
- **Valida antes de escribir.** Si un archivo de clima no es el de su zona o su punto, si trae `-999` o si un plan usa un cultivo sin reglas, no carga nada y sale con error.
- Las tablas de demo tienen restricciones (`CHECK`) que impiden guardar perfiles con credenciales.

## Rutas

Prefijo: `/api/v1`. Los ejemplos funcionan después de la carga.

| Ruta | Qué devuelve |
|---|---|
| `GET /bundle` | Manifiesto del paquete: versión y, por documento, `doc_id`, `kind`, `format_version`, `sha256`, `bytes` y `url` |
| `GET /climate/zones` | `zonas.json` |
| `GET /climate/datasets?zone_id=&kind=` | Índice de conjuntos climáticos (los dos filtros son opcionales) |
| `GET /climate/datasets/{dataset_id}` | Metadatos de un conjunto |
| `GET /climate/datasets/{dataset_id}/content` | El archivo de clima completo de esa zona |
| `GET /strategies/plans` | `planes.json` |
| `GET /strategies/rules` | `reglas.json` |
| `GET /catalogs/{nombre}` | `crops`, `seeds`, `soils`, `municipios` y `listas` (archivos cargados); `varieties` y `stages` (derivados) |
| `GET /demo` | Perfil y parcelas ficticios de demostración |
| `POST /consent`, `POST /contributions`, `GET /statistics` | Consentimiento, contribuciones seudónimas y agregados (sin cambios) |

```bash
curl http://localhost:8000/api/v1/bundle
curl "http://localhost:8000/api/v1/climate/datasets?zone_id=yuc-sur"
curl http://localhost:8000/api/v1/climate/datasets/yuc-sur-historical-nasa-power/content
curl http://localhost:8000/api/v1/strategies/plans
curl http://localhost:8000/api/v1/catalogs/crops
curl http://localhost:8000/api/v1/demo
```

- Los documentos se sirven con el **cuerpo exacto** que se cargó: el SHA-256 de la respuesta es el que anuncia `/bundle`. La PWA lo comprueba.
- Con la base vacía, `/bundle` responde `{"bundle_version": null, "documents": []}` y la PWA usa su respaldo local.
- Errores: `{"error": {"code", "message"}}` (por ejemplo `404 unknown_catalog`, `404 demo_not_loaded`, `503 database_not_ready`).

## Abrir la PWA desde la computadora y desde el celular

**En la computadora.** En `app/`: `npm run dev` o `npm run build && npm run preview`. La PWA en `http://localhost:5173` busca la API en `http://localhost:8000/api/v1`.

**CORS.** Con `APP_ENV=development` la API acepta `localhost` y las IP privadas (10.x, 172.16–31.x y 192.168.x) en cualquier puerto. Para otros orígenes, usa `CORS_ORIGINS` o `CORS_ORIGIN_REGEX` en `.env`.

**En el celular.** El service worker (lo que permite usar la app sin conexión) solo se instala en un contexto seguro: `https` o `localhost`. Hay dos caminos:

1. **Recomendado, con cable (Android):** la API también sirve la PWA, así que basta un puerto.
   ```bash
   cd app && npm run build              # genera app/dist
   cd ../server && docker compose restart api
   adb reverse tcp:8000 tcp:8000        # el celular ve el puerto 8000 de la computadora como localhost
   ```
   En Chrome del celular abre `http://localhost:8000/`. Es contexto seguro: se instala el service worker y la verificación usa SHA-256.
2. **Por la red local, sin cable:** abre `http://IP-de-la-computadora:8000/` (misma red Wi-Fi; en Windows hay que permitir el puerto 8000 en el firewall). La app carga y consume la API, pero **sin service worker**: no funcionará en modo avión, y la verificación del paquete queda por tamaño. Para probar el modo avión por red hace falta `https` (por ejemplo, un túnel).

La guía de prueba en modo avión está en `app/README.md`.

## Sin Docker (Windows)

Necesitas un PostgreSQL con PostGIS. Lo más simple es levantar solo la base con Docker (`docker compose up -d db`).

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
$env:DATABASE_URL = "postgresql+psycopg://jaibaspace:TU_CONTRASEÑA@127.0.0.1:5432/jaibaspace"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Usa `127.0.0.1` y no `localhost` en `DATABASE_URL`: en Windows, `localhost` puede intentar primero IPv6 y cada conexión tarda unos 20 segundos.
- Sin Docker, `python -m app.seed` lee la carpeta `app/` del repositorio. Se puede cambiar con `PUBLISHED_DIR`.
- Para servir también la PWA: `$env:PWA_DIST_DIR = "..\app\dist"` antes de arrancar `uvicorn`.

## Pruebas

```powershell
python -m pytest                      # 21 pruebas; no necesitan base de datos
$env:RUN_DB_TESTS = "1"; python -m pytest tests/test_seed_integration.py   # 3 pruebas contra PostgreSQL/PostGIS
```

Las pruebas de integración escriben en la base de `DATABASE_URL` (la misma carga de demo), necesitan el esquema migrado y comprueban la carga idempotente, el orden longitud/latitud en PostGIS y que la API sirve desde la base.

## Principios del prototipo

- No hay endpoints de login ni de lectura de parcelas o historiales de personas. La demo es ficticia.
- Las contribuciones se envían solo con autorización para uso estadístico. Elegir un plan en la PWA no envía nada.
- Las estadísticas devuelven agregados por zona, cultivo y año, y se ocultan cuando la muestra es menor a `MIN_STATS_SAMPLE_SIZE` (10 por defecto; umbral provisional).
- Un identificador de envío sirve para deduplicar; no autentica ni identifica una cuenta.
- Los datos publicados exponen fuente, periodo, formato y versión.

Como no existe login, el prototipo registra la declaración de consentimiento que envía el cliente, pero no puede vincularla a una identidad ni verificar quién la otorgó. La trazabilidad, la revocación y la retención de consentimientos requieren una decisión antes de un despliegue con usuarios reales. El puerto de PostgreSQL solo se publica en `127.0.0.1`; en producción debe usarse una red privada o un servicio gestionado.
