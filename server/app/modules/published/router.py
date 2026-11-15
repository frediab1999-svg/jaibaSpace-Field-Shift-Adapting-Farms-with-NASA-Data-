from fastapi import APIRouter, Depends

from app.modules.published.deps import published_service
from app.modules.published.service import PublishedService

router = APIRouter()


@router.get("/bundle", summary="Manifiesto del paquete de datos que consume la PWA")
def bundle(service: PublishedService = Depends(published_service)) -> dict[str, object]:
    """Lista cada documento con su versión de formato, tamaño, SHA-256 y la ruta donde se sirve.

    La PWA descarga todos, comprueba tamaño y huella, valida que sean coherentes entre sí y
    guarda el paquete completo en el teléfono. `documents` vacío = falta correr la carga.
    """
    return service.bundle()
