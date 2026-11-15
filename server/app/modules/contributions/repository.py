from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.contributions.model import Contribution


class ContributionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, submission_id: UUID) -> Contribution | None:
        return self.db.get(Contribution, submission_id)

    def add(self, contribution: Contribution) -> None:
        self.db.add(contribution)
        self.db.commit()
