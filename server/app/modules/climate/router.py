from typing import Literal

from fastapi import APIRouter, Depends, Response

from app.modules.published.deps import published_service
from app.modules.published.service import PublishedService, document_response

router = APIRouter()


@router.get("/zones", summary="Zonas agroclimáticas y su punto de referencia de clima")
def get_zones(service: PublishedService = Depends(published_service)) -> Response:
    """El documento zonas.json. El punto de cada zona es una referencia regional, no una parcela."""
    return document_response(service.document("zonas.json"))


@router.get("/datasets", summary="Lista conjuntos climáticos publicados")
def list_datasets(
    zone_id: str | None = None,
    kind: Literal["historical", "projection"] | None = None,
    service: PublishedService = Depends(published_service),
) -> dict[str, object]:
    """Índice con procedencia, periodo, resolución, corte y versión de cada conjunto."""
    items = service.climate_datasets(zone_id, kind)
    return {"zone_id": zone_id, "kind": kind, "items": items, "count": len(items)}


@router.get("/datasets/{dataset_id}", summary="Metadatos de un conjunto climático")
def get_dataset(
    dataset_id: str, service: PublishedService = Depends(published_service)
) -> dict[str, object]:
    return service.dataset_info(service.climate_dataset(dataset_id))


@router.get("/datasets/{dataset_id}/content", summary="Contenido de un conjunto climático")
def get_dataset_content(
    dataset_id: str, service: PublishedService = Depends(published_service)
) -> Response:
    """El archivo completo (temporadas, rachas secas, episodios de calor, fuentes y definiciones)."""
    row = service.climate_dataset(dataset_id)
    return document_response(service.document(row.doc_id))
