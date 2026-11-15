from fastapi import APIRouter
from typing import Literal

from app.modules.climate.service import ClimateService

router = APIRouter()

@router.get("/datasets", summary="Lista conjuntos climáticos publicados")
def list_datasets(
    zone_id: str,
    kind: Literal["historical", "projection"] | None = None,
) -> dict[str, object]:
    items = ClimateService().list_datasets(zone_id, kind)
    return {"zone_id": zone_id, "kind": kind, "items": items, "count": len(items)}
