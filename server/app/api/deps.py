from collections.abc import Generator

from sqlalchemy.orm import Session

from app.database.session import get_db


def database_session() -> Generator[Session, None, None]:
    """Dependency de FastAPI para obtener y cerrar una sesión de base de datos."""
    yield from get_db()
