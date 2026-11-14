from pydantic import BaseModel


class CatalogItem(BaseModel):
    id: str
    name: str
    source: str | None = None
    updated_at: str | None = None
