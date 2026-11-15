from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.contributions.schemas import ContributionCreate


def test_contribution_accepts_optional_harvest_details():
    contribution = ContributionCreate(
        submission_id=uuid4(),
        consent_id=uuid4(),
        zone_id="yuc-sur",
        crop_id="maiz",
        season_year=2025,
    )

    assert contribution.quantity is None
    assert contribution.outcome is None


def test_contribution_rejects_negative_quantity():
    with pytest.raises(ValidationError):
        ContributionCreate(
            submission_id=uuid4(),
            consent_id=uuid4(),
            zone_id="yuc-sur",
            crop_id="maiz",
            season_year=2025,
            quantity=-1,
        )
