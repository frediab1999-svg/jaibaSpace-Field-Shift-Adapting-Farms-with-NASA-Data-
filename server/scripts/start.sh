#!/bin/sh
# Arranque en producción (Render). Si algo falla, el despliegue falla y el error queda en los logs.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: falta la variable DATABASE_URL (cadena de conexión de Supabase)." >&2
  exit 1
fi

echo "== Migraciones (alembic upgrade head)"
alembic upgrade head

if [ "${RUN_SEED_ON_START:-1}" = "1" ]; then
  echo "== Carga de datos publicados y demo (idempotente)"
  python -m app.seed
fi

echo "== API y PWA en el puerto ${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips='*'
