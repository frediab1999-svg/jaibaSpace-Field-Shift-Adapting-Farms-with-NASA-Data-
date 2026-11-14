from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import database_session
from app.modules.consent.schemas import ConsentGrant
from app.modules.consent.service import ConsentService

router = APIRouter()


@router.post("", status_code=201, summary="Registra una decisión de consentimiento")
def register_consent(
    grant: ConsentGrant,
    db: Session = Depends(database_session),
) -> dict[str, str | bool]:
    consent_id = ConsentService(db).record(grant)
    return {"consent_id": str(consent_id), "granted": grant.granted}
