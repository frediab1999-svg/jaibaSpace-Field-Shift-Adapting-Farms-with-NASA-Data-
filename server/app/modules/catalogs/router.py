from fastapi import APIRouter
from fastapi import HTTPException

from app.modules.catalogs.service import CatalogService

router = APIRouter()

@router.get("/{catalog_name}", summary="Consulta un catálogo publicado")
def list_catalog(catalog_name: str) -> dict[str, object]:
    try:
        items = CatalogService().list_catalog(catalog_name)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="unknown_catalog") from exc
    return {"catalog": catalog_name, "items": items, "count": len(items)}
