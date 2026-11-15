"""Create initial consent and collective contribution tables."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "consent_records",
        sa.Column("consent_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("purpose", sa.String(length=60), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("notice_version", sa.String(length=40), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "contributions",
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "consent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("consent_records.consent_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("zone_id", sa.String(length=80), nullable=False),
        sa.Column("crop_id", sa.String(length=80), nullable=False),
        sa.Column("variety_id", sa.String(length=100), nullable=True),
        sa.Column("season_year", sa.Integer(), nullable=False),
        sa.Column("sowing_date", sa.Date(), nullable=True),
        sa.Column("harvest_date", sa.Date(), nullable=True),
        sa.Column("outcome", sa.String(length=20), nullable=True),
        sa.Column("perceived_cause", sa.String(length=120), nullable=True),
        sa.Column("quantity", sa.Numeric(precision=12, scale=3), nullable=True),
        sa.Column("quantity_unit", sa.String(length=40), nullable=True),
        sa.Column("quantity_is_estimate", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_contributions_consent_id", "contributions", ["consent_id"])
    op.create_index("ix_contributions_zone_id", "contributions", ["zone_id"])
    op.create_index("ix_contributions_crop_id", "contributions", ["crop_id"])
    op.create_index("ix_contributions_season_year", "contributions", ["season_year"])


def downgrade() -> None:
    op.drop_index("ix_contributions_season_year", table_name="contributions")
    op.drop_index("ix_contributions_crop_id", table_name="contributions")
    op.drop_index("ix_contributions_zone_id", table_name="contributions")
    op.drop_index("ix_contributions_consent_id", table_name="contributions")
    op.drop_table("contributions")
    op.drop_table("consent_records")
