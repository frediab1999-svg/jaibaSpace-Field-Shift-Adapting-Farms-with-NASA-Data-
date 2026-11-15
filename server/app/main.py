from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(
    title="jaibaSpace API",
    description=(
        "API del prototipo multicultivo. Publica el contenido que usa la PWA (zonas, clima, "
        "planes, reglas y catálogos) y un perfil ficticio de demostración. No ofrece login ni "
        "consultas de historiales individuales."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Idempotency-Key"],
)

register_exception_handlers(app)
app.include_router(api_router, prefix="/api/v1")

# Opcional: servir el build de la PWA desde la misma API (un solo origen y un solo puerto,
# útil para abrirla en el celular). Va al final para no tapar las rutas de /api.
if settings.pwa_dist_path is not None:
    app.mount("/", StaticFiles(directory=settings.pwa_dist_path, html=True), name="pwa")
