from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import database_session
from app.modules.published.repository import PublishedRepository

router = APIRouter()


@router.get("/health", summary="Comprueba que la API responde")
def health() -> dict[str, str]:
    """Solo dice que el proceso está vivo. No toca la base de datos."""
    return {"status": "ok"}


@router.get("/ready", summary="Comprueba que las dependencias de la API están listas")
def readiness(db: Session = Depends(database_session)) -> dict[str, object]:
    """Listo = la base responde, el esquema está migrado y el contenido está cargado."""
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="database_unavailable") from exc
    try:
        documents = PublishedRepository(db).count_documents()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="schema_not_migrated") from exc
    if documents == 0:
        raise HTTPException(status_code=503, detail="content_not_loaded")
    return {"status": "ready", "database": "ok", "published_documents": documents}
