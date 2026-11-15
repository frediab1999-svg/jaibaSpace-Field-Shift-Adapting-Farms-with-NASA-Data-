from fastapi import APIRouter, Depends, Response

from app.modules.published.deps import published_service
from app.modules.published.service import PublishedService, document_response

router = APIRouter()


@router.get("/plans", summary="Planes de dos ciclos que compara la PWA")
def get_plans(service: PublishedService = Depends(published_service)) -> Response:
    """El documento planes.json: estrategias con ciclos de uno o varios cultivos, fuentes y supuestos."""
    return document_response(service.document("planes.json"))


@router.get("/rules", summary="Reglas de cultivo, etapas y suelos del motor")
def get_rules(service: PublishedService = Depends(published_service)) -> Response:
    """El documento reglas.json. La comparación se calcula en el teléfono, no en el servidor."""
    return document_response(service.document("reglas.json"))
