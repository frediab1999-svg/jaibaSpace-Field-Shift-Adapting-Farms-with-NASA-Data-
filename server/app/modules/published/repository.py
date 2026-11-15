from geoalchemy2.functions import ST_X, ST_Y
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.published.model import (
    ClimateDataset,
    DemoParcel,
    DemoProfile,
    PublishedDocument,
    Zone,
)


class PublishedRepository:
    """Lecturas del contenido publicado. Las escrituras las hace solo `app.seed`."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ---- documentos ----
    def get_document(self, doc_id: str) -> PublishedDocument | None:
        return self.db.get(PublishedDocument, doc_id)

    def list_documents(self) -> list[PublishedDocument]:
        return list(self.db.scalars(select(PublishedDocument).order_by(PublishedDocument.doc_id)))

    def count_documents(self) -> int:
        return self.db.scalar(select(func.count()).select_from(PublishedDocument)) or 0

    # ---- clima ----
    def list_climate_datasets(
        self, zone_id: str | None = None, kind: str | None = None
    ) -> list[ClimateDataset]:
        query = select(ClimateDataset).order_by(ClimateDataset.dataset_id)
        if zone_id:
            query = query.where(ClimateDataset.zone_id == zone_id)
        if kind:
            query = query.where(ClimateDataset.kind == kind)
        return list(self.db.scalars(query))

    def get_climate_dataset(self, dataset_id: str) -> ClimateDataset | None:
        return self.db.get(ClimateDataset, dataset_id)

    def list_zone_points(self) -> list[dict]:
        """Zonas con su punto leído de PostGIS: ST_Y es la latitud y ST_X la longitud."""
        rows = self.db.execute(
            select(
                Zone.zone_id,
                Zone.name,
                Zone.state,
                ST_Y(Zone.reference_point),
                ST_X(Zone.reference_point),
                Zone.climate_doc_id,
            ).order_by(Zone.zone_id)
        ).all()
        return [
            {"zone_id": z, "name": n, "state": s, "lat": lat, "lon": lon, "climate_doc_id": d}
            for z, n, s, lat, lon, d in rows
        ]

    # ---- demo ----
    def get_demo(
        self,
    ) -> tuple[DemoProfile, list[tuple[DemoParcel, float | None, float | None]]] | None:
        profile = self.db.scalars(select(DemoProfile).order_by(DemoProfile.profile_id)).first()
        if profile is None:
            return None
        rows = self.db.execute(
            select(DemoParcel, ST_Y(DemoParcel.location), ST_X(DemoParcel.location))
            .where(DemoParcel.profile_id == profile.profile_id)
            .order_by(DemoParcel.position)
        ).all()
        return profile, [(parcel, lat, lon) for parcel, lat, lon in rows]
