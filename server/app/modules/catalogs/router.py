from fastapi import APIRouter, Depends, Response
from fastapi.responses import JSONResponse

from app.modules.published.deps import published_service
from app.modules.published.service import PublishedService, document_response

router = APIRouter()


@router.get("/{catalog_name}", summary="Consulta un catálogo publicado")
def get_catalog(
    catalog_name: str, service: PublishedService = Depends(published_service)
) -> Response:
    """`{catalog, items, count, …}`.

    crops, seeds, soils, municipios y listas son los archivos de `app/data/catalogos` cargados
    en la base (siguen marcados `esEjemplo`). varieties y stages se derivan de seeds y reglas.
    """
    catalog = service.catalog(catalog_name)
    if isinstance(catalog, dict):
        return JSONResponse(catalog)
    return document_response(catalog)
