from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import database_session

router = APIRouter()


@router.get("/health", summary="Comprueba que la API responde")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", summary="Comprueba que la API puede usar la base de datos")
def readiness(db: Session = Depends(database_session)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="database_unavailable") from exc
    return {"status": "ready"}
