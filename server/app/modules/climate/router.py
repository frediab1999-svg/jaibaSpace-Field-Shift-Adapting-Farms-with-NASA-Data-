from typing import Literal

from fastapi import APIRouter, Depends, Query, Response

from app.core.errors import AppError
from app.modules.climate.punto import ClimaPuntoService, PuntoFueraDeCobertura, clima_punto_service
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


@router.get("/point", summary="Clima histórico del punto de una parcela (NASA POWER)")
def get_point(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    service: ClimaPuntoService = Depends(clima_punto_service),
) -> dict[str, object]:
    """Lluvia (GPM IMERG) y temperatura máxima (MERRA-2) de 1998 a 2025 para el punto,
    resumidas en rachas secas y episodios de calor, con la forma de los archivos de zona.
    No se guarda la ubicación: solo el resultado por celda redondeada a dos decimales."""
    try:
        return service.obtener(lat, lon)
    except PuntoFueraDeCobertura as e:
        raise AppError("point_out_of_coverage", str(e), 422) from e
    except OSError as e:  # sin red, NASA no responde o tarda demasiado
        mensaje = "No pudimos descargar el clima de la NASA para este punto."
        raise AppError("nasa_power_unavailable", mensaje, 502) from e
