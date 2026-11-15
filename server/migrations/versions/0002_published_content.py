"""Published content (documents, zones, climate index) and demo profile/parcels."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

revision: str = "0002_published_content"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "published_documents",
        sa.Column("doc_id", sa.String(length=120), primary_key=True),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("format_version", sa.String(length=40), nullable=True),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("source_path", sa.String(length=200), nullable=False),
        sa.Column(
            "loaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )

    op.create_table(
        "zones",
        sa.Column("zone_id", sa.String(length=80), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("state", sa.String(length=80), nullable=False),
        # Punto de referencia del clima de la zona: (x, y) = (longitud, latitud), SRID 4326
        sa.Column(
            "reference_point",
            Geometry("POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column(
            "climate_doc_id",
            sa.String(length=120),
            sa.ForeignKey("published_documents.doc_id", ondelete="RESTRICT"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_zones_reference_point", "zones", ["reference_point"], postgresql_using="gist"
    )

    op.create_table(
        "climate_datasets",
        sa.Column("dataset_id", sa.String(length=120), primary_key=True),
        sa.Column(
            "zone_id",
            sa.String(length=80),
            sa.ForeignKey("zones.zone_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("source", sa.String(length=200), nullable=False),
        sa.Column("scenario", sa.String(length=80), nullable=True),
        sa.Column("period_start", sa.Integer(), nullable=False),
        sa.Column("period_end", sa.Integer(), nullable=False),
        sa.Column("complete_years", sa.Integer(), nullable=False),
        sa.Column("resolution", sa.String(length=160), nullable=True),
        sa.Column("format_version", sa.String(length=40), nullable=False),
        sa.Column("version", sa.String(length=80), nullable=False),
        sa.Column("cutoff_date", sa.String(length=10), nullable=False),
        sa.Column("time_standard", sa.String(length=20), nullable=False),
        sa.Column("parameters", postgresql.JSONB(), nullable=False),
        sa.Column("updated_at", sa.String(length=40), nullable=False),
        sa.Column(
            "doc_id",
            sa.String(length=120),
            sa.ForeignKey("published_documents.doc_id", ondelete="RESTRICT"),
            nullable=False,
        ),
    )
    op.create_index("ix_climate_datasets_zone_id", "climate_datasets", ["zone_id"])

    op.create_table(
        "demo_profiles",
        sa.Column("profile_id", sa.String(length=80), primary_key=True),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("requires_credentials", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        # Estas tablas solo guardan datos ficticios de demostración, nunca perfiles con credenciales
        sa.CheckConstraint(
            "is_demo AND NOT requires_credentials", name="ck_demo_profiles_demo_only"
        ),
    )

    op.create_table(
        "demo_parcels",
        sa.Column("parcel_id", sa.String(length=80), primary_key=True),
        sa.Column(
            "profile_id",
            sa.String(length=80),
            sa.ForeignKey("demo_profiles.profile_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("municipality_id", sa.String(length=80), nullable=True),
        sa.Column(
            "zone_id",
            sa.String(length=80),
            sa.ForeignKey("zones.zone_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("location", Geometry("POINT", srid=4326, spatial_index=False), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("records", postgresql.JSONB(), nullable=False),
        sa.CheckConstraint("is_demo", name="ck_demo_parcels_demo_only"),
    )
    op.create_index("ix_demo_parcels_profile_id", "demo_parcels", ["profile_id"])


def downgrade() -> None:
    op.drop_index("ix_demo_parcels_profile_id", table_name="demo_parcels")
    op.drop_table("demo_parcels")
    op.drop_table("demo_profiles")
    op.drop_index("ix_climate_datasets_zone_id", table_name="climate_datasets")
    op.drop_table("climate_datasets")
    op.drop_index("ix_zones_reference_point", table_name="zones")
    op.drop_table("zones")
    op.drop_table("published_documents")
