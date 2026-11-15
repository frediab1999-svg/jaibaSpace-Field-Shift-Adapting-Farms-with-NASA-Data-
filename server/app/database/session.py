from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import engine_connect_args, get_settings

settings = get_settings()
engine = create_engine(
    settings.sqlalchemy_url,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=2,
    connect_args=engine_connect_args(settings.sqlalchemy_url),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
