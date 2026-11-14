from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.modules.consent.model import ConsentRecord
from app.modules.consent.repository import ConsentRepository
from app.modules.consent.schemas import ConsentGrant


class ConsentService:
    def __init__(self, db: Session) -> None:
        self.repository = ConsentRepository(db)

    def record(self, grant: ConsentGrant) -> UUID:
        existing = self.repository.get(grant.consent_id)
        if existing is not None:
            raise AppError("consent_id_already_exists", "El identificador de consentimiento ya existe.", 409)
        self.repository.add(ConsentRecord(**grant.model_dump()))
        return grant.consent_id

    def permits_statistics(self, consent_id: UUID) -> bool:
        record = self.repository.get(consent_id)
        return bool(record and record.granted and record.purpose == "collective_statistics")
