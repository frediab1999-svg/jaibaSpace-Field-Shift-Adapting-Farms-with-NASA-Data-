# jaibaSpace Server

Servidor FastAPI para el prototipo multicultivo de jaibaSpace. El prototipo no tiene login ni cuentas: la API recibirá únicamente contribuciones seudónimas autorizadas para estadísticas colectivas. El historial personal permanece en el dispositivo.

## Requisitos

- Python 3.12 o posterior dentro de la serie 3.x compatible con las dependencias del proyecto.
- Docker y Docker Compose para ejecutar API y PostgreSQL/PostGIS juntos; o PostgreSQL/PostGIS instalado localmente.

## Configuración local con Docker Compose

1. Copia `.env.example` como `.env` y cambia `POSTGRES_PASSWORD` por un valor local.
2. Desde esta carpeta, ejecuta `docker compose up --build`.
3. La API estará disponible en `http://localhost:8000`; la documentación interactiva, en `/docs` cuando exista el punto de entrada FastAPI.
4. Para detener los servicios, ejecuta `docker compose down`. Los datos de desarrollo permanecen en el volumen local `postgres_data`.

> La configuración contenedora queda preparada antes que la aplicación. El servidor no arrancará hasta que exista `app/main.py` y se implemente FastAPI.

## Configuración sin Docker

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
```

Define `DATABASE_URL` y las demás variables de `.env.example` en el entorno y ejecuta la API con:

```text
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Las migraciones se aplicarán con `alembic upgrade head` una vez que se creen `app/main.py`, `migrations/env.py` y la primera migración.

## Principios del prototipo

- No hay endpoints de login ni de lectura de parcelas o historiales individuales.
- Las contribuciones se envían solo con autorización para uso estadístico.
- Los endpoints de estadísticas devuelven agregados por zona, cultivo y periodo.
- Un identificador de envío sirve para deduplicación; no autentica ni identifica una cuenta.
- Los datos del pipeline y los escenarios deben exponer fuente, periodo y versión.
