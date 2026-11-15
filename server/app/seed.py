"""Carga de demo, reproducible e idempotente.

    python -m app.seed            # desde server/ (o: docker compose exec api python -m app.seed)

Lee los archivos publicados de PUBLISHED_DIR (por defecto, la carpeta app/ del repositorio):
  data/zonas.json, data/planes.json, data/reglas.json, data/clima/*.json, data/catalogos/*.json
  y fixtures/ejemplo-milpa.json (perfil y parcelas FICTICIOS de demostración).

Cada fila se identifica por su clave (doc_id, zone_id, dataset_id, profile_id, parcel_id) y se
inserta o actualiza con esa clave; lo que ya no está en los archivos se borra. Por eso correrla
dos veces deja exactamente lo mismo: sin duplicados y con las mismas huellas.
Antes de escribir valida que los archivos sean coherentes; si no lo son, no cambia nada.
"""

import sys
from pathlib import Path

from geoalchemy2 import WKTElement
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.session import SessionLocal
from app.modules.published.loader import (
    Document,
    build_documents,
    bundle_version,
    climate_index_row,
    demo_parcel_records,
    load_demo,
)
from app.modules.published.model import (
    ClimateDataset,
    DemoParcel,
    DemoProfile,
    PublishedDocument,
    Zone,
)


def _point(lat: float, lon: float) -> WKTElement:
    """WKT de PostGIS: POINT(x y) = POINT(longitud latitud)."""
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


_pending_deletes: list = []


def _upsert(db: Session, model, key: str, rows: list[dict]) -> dict[str, int]:
    """Inserta o actualiza por clave primaria. Lo que ya no viene se borra al final (ver seed)."""
    column = getattr(model, key)
    existing = set(db.scalars(select(column)))
    incoming = {row[key] for row in rows}
    for row in rows:
        db.merge(model(**row))
    removed = existing - incoming
    if removed:
        _pending_deletes.append(delete(model).where(column.in_(removed)))
    return {
        "nuevas": len(incoming - existing),
        "actualizadas": len(incoming & existing),
        "borradas": len(removed),
    }


def seed(db: Session, published_dir: Path) -> dict:
    _pending_deletes.clear()
    documents: list[Document] = build_documents(published_dir)  # valida antes de tocar la base
    demo = load_demo(published_dir)
    by_id = {doc.doc_id: doc for doc in documents}
    zonas = by_id["zonas.json"].data["zonas"]
    municipios = {m["id"]: m for m in by_id["catalogos/municipios.json"].data["items"]}

    report = {}
    report["published_documents"] = _upsert(
        db,
        PublishedDocument,
        "doc_id",
        [
            {
                "doc_id": doc.doc_id,
                "kind": doc.kind,
                "format_version": doc.format_version,
                "sha256": doc.sha256,
                "size_bytes": doc.size_bytes,
                "body": doc.body,
                "source_path": doc.source_path,
            }
            for doc in documents
        ],
    )
    db.flush()
    report["zones"] = _upsert(
        db,
        Zone,
        "zone_id",
        [
            {
                "zone_id": z["id"],
                "name": z["nombre"],
                "state": z["estado"],
                "reference_point": _point(z["punto"]["lat"], z["punto"]["lon"]),
                "climate_doc_id": z["archivoClima"],
            }
            for z in zonas
        ],
    )
    db.flush()
    report["climate_datasets"] = _upsert(
        db,
        ClimateDataset,
        "dataset_id",
        [climate_index_row(z, by_id[z["archivoClima"]]) for z in zonas],
    )

    perfil = demo["perfil"]
    report["demo_profiles"] = _upsert(
        db,
        DemoProfile,
        "profile_id",
        [
            {
                "profile_id": perfil["id"],
                "display_name": perfil["nombreVisible"],
                "is_demo": True,
                "requires_credentials": False,
                "payload": {"version": demo.get("version"), "nota": demo.get("nota")},
            }
        ],
    )
    db.flush()
    parcels = []
    for position, parcela in enumerate(demo["parcelas"]):
        ubicacion = parcela.get("ubicacion")
        # La zona solo se asigna aquí cuando el municipio declarado tiene una correspondencia
        # respaldada; si no, queda vacía y la PWA la deriva (o la muestra como pendiente).
        municipio = municipios.get(parcela.get("municipioId") or "")
        parcels.append(
            {
                "parcel_id": parcela["id"],
                "profile_id": perfil["id"],
                "position": position,
                "name": parcela["nombre"],
                "is_demo": True,
                "municipality_id": parcela.get("municipioId"),
                "zone_id": municipio.get("zonaId") if municipio else None,
                "location": _point(ubicacion["lat"], ubicacion["lon"]) if ubicacion else None,
                "payload": parcela,
                "records": demo_parcel_records(demo, parcela["id"]),
            }
        )
    report["demo_parcels"] = _upsert(db, DemoParcel, "parcel_id", parcels)
    db.flush()
    # Los borrados van al final y en orden inverso, para respetar las llaves foráneas
    for statement in reversed(_pending_deletes):
        db.execute(statement)
    db.commit()

    report["bundle_version"] = bundle_version(documents)
    report["totales"] = {
        model.__tablename__: db.scalar(select(func.count()).select_from(model))
        for model in (PublishedDocument, Zone, ClimateDataset, DemoProfile, DemoParcel)
    }
    return report


def main() -> int:
    published_dir = get_settings().published_path
    print(f"Archivos publicados: {published_dir}")
    with SessionLocal() as db:
        try:
            report = seed(db, published_dir)
        except Exception as exc:  # noqa: BLE001  (se informa y se sale con error; no queda nada a medias)
            db.rollback()
            print(f"ERROR: no se cargó nada. {type(exc).__name__}: {exc}", file=sys.stderr)
            return 1
    for table in (
        "published_documents",
        "zones",
        "climate_datasets",
        "demo_profiles",
        "demo_parcels",
    ):
        r = report[table]
        print(
            f"  {table:20} total {report['totales'][table]:3}  "
            f"(nuevas {r['nuevas']}, actualizadas {r['actualizadas']}, borradas {r['borradas']})"
        )
    print(f"Paquete publicado: {report['bundle_version']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
