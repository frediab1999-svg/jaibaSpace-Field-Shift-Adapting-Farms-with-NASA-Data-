"""Lógica de lectura del contenido publicado, compartida por las rutas."""

import hashlib
import json

from fastapi import Response

from app.core.errors import AppError

CATALOG_DOCUMENTS = ("crops", "seeds", "soils", "municipios", "listas")
DERIVED_CATALOGS = ("varieties", "stages")


def document_url(doc_id: str) -> str:
    """Ruta (relativa a /api/v1) donde se sirve cada documento del paquete."""
    if doc_id == "zonas.json":
        return "/climate/zones"
    if doc_id == "planes.json":
        return "/strategies/plans"
    if doc_id == "reglas.json":
        return "/strategies/rules"
    if doc_id.startswith("catalogos/"):
        return f"/catalogs/{doc_id.removeprefix('catalogos/').removesuffix('.json')}"
    if doc_id.startswith("clima/"):
        return f"/climate/datasets/{dataset_id_for(doc_id)}/content"
    raise ValueError(f"Documento sin ruta: {doc_id}")


def dataset_id_for(climate_doc_id: str) -> str:
    zone_id = climate_doc_id.removeprefix("clima/").removesuffix(".json")
    return f"{zone_id}-historical-nasa-power"


def document_response(document) -> Response:
    """Devuelve el cuerpo EXACTO que se cargó: su SHA-256 es el que anuncia el manifiesto."""
    return Response(
        content=document.body.encode("utf-8"),
        media_type="application/json",
        headers={"ETag": f'"{document.sha256}"', "Cache-Control": "no-cache"},
    )


class PublishedService:
    def __init__(self, repository) -> None:
        self.repository = repository

    def document(self, doc_id: str, missing_code: str = "content_not_loaded"):
        document = self.repository.get_document(doc_id)
        if document is None:
            raise AppError(
                missing_code,
                f"No está cargado {doc_id}. Aplica las migraciones y corre `python -m app.seed`.",
                404,
            )
        return document

    # ---- manifiesto del paquete ----
    def bundle(self) -> dict[str, object]:
        documents = self.repository.list_documents()
        digest = hashlib.sha256()
        for doc in documents:  # ya vienen ordenados por doc_id
            digest.update(f"{doc.doc_id}:{doc.sha256}\n".encode())
        loaded = [doc.loaded_at for doc in documents if doc.loaded_at is not None]
        return {
            "bundle_version": digest.hexdigest()[:12] if documents else None,
            "generated_at": max(loaded).isoformat() if loaded else None,
            "documents": [
                {
                    "doc_id": doc.doc_id,
                    "kind": doc.kind,
                    "format_version": doc.format_version,
                    "sha256": doc.sha256,
                    "bytes": doc.size_bytes,
                    "url": document_url(doc.doc_id),
                }
                for doc in documents
            ],
        }

    # ---- catálogos ----
    def catalog(self, name: str):
        """Documento del catálogo, o un dict cuando el catálogo se deriva de otros."""
        if name in CATALOG_DOCUMENTS:
            return self.document(f"catalogos/{name}.json")
        if name == "varieties":
            seeds = json.loads(self.document("catalogos/seeds.json").body)["items"]
            items = [
                {
                    "id": s["variedadId"],
                    "name": s["name"],
                    "crop_id": s["cultivoId"],
                    "source": s.get("source"),
                    "updated_at": s.get("updated_at"),
                }
                for s in seeds
                if s.get("variedadId")
            ]
            return {"catalog": name, "items": items, "count": len(items)}
        if name == "stages":
            reglas = json.loads(self.document("reglas.json").body)
            items = [
                {
                    "id": f"{crop_id}:{etapa['id']}",
                    "name": etapa["nombre"],
                    "crop_id": crop_id,
                    "from_day": etapa["desdeDia"],
                    "to_day": etapa["hastaDia"],
                    "sensitivity": etapa["sensibilidad"],
                    "source": f"reglas.json v{reglas['version']}",
                }
                for crop_id, crop in reglas["cultivos"].items()
                for etapa in crop["etapas"]
            ]
            return {"catalog": name, "items": items, "count": len(items)}
        raise AppError("unknown_catalog", f"No existe el catálogo {name}.", 404)

    # ---- clima ----
    @staticmethod
    def dataset_info(row) -> dict[str, object]:
        return {
            "dataset_id": row.dataset_id,
            "zone_id": row.zone_id,
            "kind": row.kind,
            "source": row.source,
            "scenario": row.scenario,
            "period_start": row.period_start,
            "period_end": row.period_end,
            "complete_years": row.complete_years,
            "resolution": row.resolution,
            "format_version": row.format_version,
            "version": row.version,
            "cutoff_date": row.cutoff_date,
            "time_standard": row.time_standard,
            "parameters": row.parameters,
            "updated_at": row.updated_at,
            "content_url": f"/climate/datasets/{row.dataset_id}/content",
        }

    def climate_datasets(self, zone_id: str | None, kind: str | None) -> list[dict[str, object]]:
        return [self.dataset_info(r) for r in self.repository.list_climate_datasets(zone_id, kind)]

    def climate_dataset(self, dataset_id: str):
        row = self.repository.get_climate_dataset(dataset_id)
        if row is None:
            raise AppError("unknown_dataset", f"No existe el conjunto climático {dataset_id}.", 404)
        return row

    # ---- demo ----
    def demo(self) -> dict[str, object]:
        found = self.repository.get_demo()
        if found is None:
            raise AppError(
                "demo_not_loaded",
                "No hay datos de demostración. Corre `python -m app.seed`.",
                404,
            )
        profile, parcels = found
        parcelas, temporadas, siembras, historial, cosechas = [], [], [], [], {}
        for parcel, lat, lon in parcels:
            payload = dict(parcel.payload)
            if lat is not None and lon is not None:
                # El punto sale de PostGIS (ST_Y = latitud, ST_X = longitud), no del JSON guardado
                payload["ubicacion"] = {**(payload.get("ubicacion") or {}), "lat": lat, "lon": lon}
            payload["esDemo"] = parcel.is_demo
            payload["zonaIdServidor"] = parcel.zone_id
            parcelas.append(payload)
            temporadas += parcel.records.get("temporadas", [])
            siembras += parcel.records.get("siembras", [])
            historial += parcel.records.get("historial", [])
            cosechas.update(parcel.records.get("cosechas", {}))
        return {
            "version": profile.payload.get("version"),
            "esEjemplo": True,
            "origen": "servidor",
            "nota": profile.payload.get("nota"),
            "perfil": {
                "id": profile.profile_id,
                "nombreVisible": profile.display_name,
                "esDemo": profile.is_demo,
                "requiereCredenciales": profile.requires_credentials,
            },
            "usuario": {"nombreVisible": profile.display_name},
            "parcelas": parcelas,
            "temporadas": temporadas,
            "siembras": siembras,
            "cosechas": cosechas,
            "historial": historial,
        }
