class CatalogRepository:
    """Acceso a catálogos versionados; la fuente persistente se definirá después."""

    def list_catalog(self, catalog_name: str) -> list[dict[str, object]]:
        # TODO: conectar con la fuente acordada (DB o export del pipeline).
        return []
