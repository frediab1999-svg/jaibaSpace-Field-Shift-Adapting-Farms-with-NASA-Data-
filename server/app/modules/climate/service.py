from typing import Literal


class ClimateService:
    """Sirve conjuntos preparados por el pipeline, sin descargar datos por petición."""

    def list_datasets(
        self, zone_id: str, kind: Literal["historical", "projection"] | None = None
    ) -> list[dict[str, object]]:
        # TODO: leer el índice de conjuntos publicados y aplicar filtros.
        return []
