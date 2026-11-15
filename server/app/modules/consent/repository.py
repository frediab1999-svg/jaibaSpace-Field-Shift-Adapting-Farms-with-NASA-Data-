from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.consent.model import ConsentRecord


class ConsentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, consent_id: UUID) -> ConsentRecord | None:
        return self.db.get(ConsentRecord, consent_id)

    def add(self, record: ConsentRecord) -> None:
        self.db.add(record)
        self.db.commit()
