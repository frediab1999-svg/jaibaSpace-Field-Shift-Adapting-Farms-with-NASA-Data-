from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.consent.schemas import ConsentGrant


def test_consent_schema_requires_a_known_purpose():
    grant = ConsentGrant(
        consent_id=uuid4(),
        purpose="collective_statistics",
        granted=True,
        notice_version="prototype-1",
        decided_at=datetime.now(UTC),
    )

    assert grant.granted is True


def test_consent_schema_rejects_unknown_purpose():
    with pytest.raises(ValidationError):
        ConsentGrant(
            consent_id=uuid4(),
            purpose="marketing",
            granted=True,
            notice_version="prototype-1",
            decided_at=datetime.now(UTC),
        )
