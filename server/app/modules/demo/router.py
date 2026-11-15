from fastapi import APIRouter, Depends

from app.modules.published.deps import published_service
from app.modules.published.service import PublishedService

router = APIRouter()


@router.get("", summary="Perfil y parcelas ficticios de demostración")
def get_demo(service: PublishedService = Depends(published_service)) -> dict[str, object]:
    """Datos FICTICIOS, sin credenciales, para recorrer la app sin capturar nada.

    No es una cuenta ni un historial real: el servidor sigue sin exponer parcelas de personas.
    """
    return service.demo()
