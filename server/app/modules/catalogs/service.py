from app.modules.catalogs.repository import CatalogRepository


class CatalogService:
    allowed_catalogs = {"crops", "varieties", "stages", "seeds"}

    def __init__(self, repository: CatalogRepository | None = None) -> None:
        self.repository = repository or CatalogRepository()

    def list_catalog(self, catalog_name: str) -> list[dict[str, object]]:
        if catalog_name not in self.allowed_catalogs:
            raise ValueError("unknown_catalog")
        return self.repository.list_catalog(catalog_name)
