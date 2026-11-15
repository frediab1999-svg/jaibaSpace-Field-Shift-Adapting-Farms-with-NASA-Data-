from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.deps import database_session
from app.modules.published.repository import PublishedRepository
from app.modules.published.service import PublishedService


def published_service(db: Session = Depends(database_session)) -> PublishedService:
    """Dependency de FastAPI. En las pruebas se sustituye por un servicio con repositorio en memoria."""
    return PublishedService(PublishedRepository(db))
