from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.modules.catalogs.router import router as catalogs_router
from app.modules.climate.router import router as climate_router
from app.modules.consent.router import router as consent_router
from app.modules.contributions.router import router as contributions_router
from app.modules.statistics.router import router as statistics_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(contributions_router, prefix="/contributions", tags=["contributions"])
api_router.include_router(consent_router, prefix="/consent", tags=["consent"])
api_router.include_router(catalogs_router, prefix="/catalogs", tags=["catalogs"])
api_router.include_router(climate_router, prefix="/climate", tags=["climate"])
api_router.include_router(statistics_router, prefix="/statistics", tags=["statistics"])
