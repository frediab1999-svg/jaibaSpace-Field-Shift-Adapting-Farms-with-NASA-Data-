from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.modules.consent.model import ConsentRecord
from app.modules.contributions.model import Contribution
from app.modules.contributions.repository import ContributionRepository
from app.modules.contributions.schemas import ContributionCreate


class ContributionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ContributionRepository(db)

    def submit(self, payload: ContributionCreate) -> tuple[UUID, bool]:
        consent = self.db.get(ConsentRecord, payload.consent_id)
        if consent is None or not consent.granted or consent.purpose != "collective_statistics":
            raise AppError(
                "consent_required",
                "Se requiere consentimiento vigente para contribuir a estadísticas colectivas.",
                403,
            )

        existing = self.repository.get(payload.submission_id)
        if existing is not None:
            return payload.submission_id, False

        contribution = Contribution(**payload.model_dump())
        self.repository.add(contribution)
        return payload.submission_id, True
