# Imagen de despliegue (Render): una sola URL con la PWA y la API.
#   - Etapa 1: compila la PWA (app/ → app/dist).
#   - Etapa 2: FastAPI sirve /api/v1 y la PWA en /, con los datos publicados dentro de la imagen.
# Al arrancar aplica las migraciones y la carga de datos (idempotente) y luego inicia uvicorn.
# Para desarrollo local se sigue usando server/docker-compose.yml.

FROM node:20-alpine AS pwa
WORKDIR /build/app
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app/ ./
RUN npm run build


FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    APP_ENV=production \
    PUBLISHED_DIR=/srv/jaibaspace/published \
    PWA_DIST_DIR=/srv/jaibaspace/published/dist

WORKDIR /srv/jaibaspace

COPY server/pyproject.toml server/README.md ./
COPY server/app ./app
COPY server/migrations ./migrations
COPY server/alembic.ini ./alembic.ini
RUN python -m pip install --upgrade pip && python -m pip install .

# Fuente de la carga de datos y PWA compilada
COPY app/data ./published/data
COPY app/fixtures ./published/fixtures
COPY --from=pwa /build/app/dist ./published/dist

COPY server/scripts/start.sh ./start.sh
RUN sed -i 's/\r$//' ./start.sh && chmod +x ./start.sh \
    && useradd --create-home --uid 10001 jaibaspace
USER jaibaspace

# Render define PORT; en local se usa 8000
EXPOSE 8000
CMD ["./start.sh"]
