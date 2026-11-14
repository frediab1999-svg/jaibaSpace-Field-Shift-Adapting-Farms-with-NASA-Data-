from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.deps import database_session
from app.modules.contributions.schemas import ContributionAccepted, ContributionCreate
from app.modules.contributions.service import ContributionService

router = APIRouter()

@router.post("", response_model=ContributionAccepted, summary="Envía una contribución consentida")
def submit_contribution(
    payload: ContributionCreate,
    db: Session = Depends(database_session),
) -> ContributionAccepted:
    submission_id, created = ContributionService(db).submit(payload)
    return ContributionAccepted(
        submission_id=submission_id,
        status="accepted" if created else "already_received",
    )
