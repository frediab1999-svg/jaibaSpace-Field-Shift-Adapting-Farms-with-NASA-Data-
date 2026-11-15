"""Contenido publicado: documentos del pipeline, zonas, índice de clima y datos de demo.

Los archivos de `app/data` son la fuente. `python -m app.seed` los carga aquí con su huella
SHA-256; la API sirve desde estas tablas, sin leer archivos ni descargar nada por petición.
"""

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class PublishedDocument(Base):
    """Un documento JSON tal como se sirve: el cuerpo exacto y su huella."""

    __tablename__ = "published_documents"

    doc_id: Mapped[str] = mapped_column(
        String(120), primary_key=True
    )  # p. ej. "clima/yuc-sur.json"
    kind: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # zones|climate|plans|rules|catalog
    format_version: Mapped[str | None] = mapped_column(String(40), nullable=True)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    source_path: Mapped[str] = mapped_column(String(200), nullable=False)
    loaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Zone(Base):
    """Zona agroclimática. `reference_point` es el punto de referencia del clima, no una parcela."""

    __tablename__ = "zones"

    zone_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    state: Mapped[str] = mapped_column(String(80), nullable=False)
    # PostGIS guarda (x, y) = (longitud, latitud), SRID 4326
    reference_point = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    climate_doc_id: Mapped[str] = mapped_column(
        String(120), ForeignKey("published_documents.doc_id", ondelete="RESTRICT"), nullable=False
    )


class ClimateDataset(Base):
    """Índice de conjuntos climáticos: metadatos del archivo que publica el pipeline."""

    __tablename__ = "climate_datasets"

    dataset_id: Mapped[str] = mapped_column(String(120), primary_key=True)
    zone_id: Mapped[str] = mapped_column(
        String(80), ForeignKey("zones.zone_id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # historical|projection
    source: Mapped[str] = mapped_column(String(200), nullable=False)
    scenario: Mapped[str | None] = mapped_column(String(80), nullable=True)
    period_start: Mapped[int] = mapped_column(Integer, nullable=False)
    period_end: Mapped[int] = mapped_column(Integer, nullable=False)
    complete_years: Mapped[int] = mapped_column(Integer, nullable=False)
    resolution: Mapped[str | None] = mapped_column(String(160), nullable=True)
    format_version: Mapped[str] = mapped_column(String(40), nullable=False)
    version: Mapped[str] = mapped_column(String(80), nullable=False)  # versión del dataset (huella)
    cutoff_date: Mapped[str] = mapped_column(String(10), nullable=False)
    time_standard: Mapped[str] = mapped_column(String(20), nullable=False)
    parameters: Mapped[dict] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[str] = mapped_column(String(40), nullable=False)
    doc_id: Mapped[str] = mapped_column(
        String(120), ForeignKey("published_documents.doc_id", ondelete="RESTRICT"), nullable=False
    )


class DemoProfile(Base):
    """Perfil FICTICIO de demostración. No tiene credenciales ni representa a una persona."""

    __tablename__ = "demo_profiles"

    profile_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    requires_credentials: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)


class DemoParcel(Base):
    """Parcela FICTICIA del perfil de demostración, con sus temporadas y siembras de ejemplo."""

    __tablename__ = "demo_parcels"

    parcel_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    profile_id: Mapped[str] = mapped_column(
        String(80), ForeignKey("demo_profiles.profile_id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    municipality_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    zone_id: Mapped[str | None] = mapped_column(
        String(80), ForeignKey("zones.zone_id", ondelete="SET NULL"), nullable=True
    )
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    records: Mapped[dict] = mapped_column(JSONB, nullable=False)
