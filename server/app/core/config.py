from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# server/app/core/config.py → la raíz del repositorio está tres carpetas arriba de app/core
_REPO_ROOT = Path(__file__).resolve().parents[3]

# Orígenes de desarrollo: la PWA abierta en la computadora (localhost) o en el celular por la
# red local (IP privada de la computadora), en cualquier puerto.
_DEV_ORIGIN_REGEX = (
    r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+"
    r"|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"
    min_stats_sample_size: int = Field(default=10, ge=2)
    database_url: str = Field(
        default="postgresql+psycopg://jaibaspace:jaibaspace@localhost:5432/jaibaspace"
    )
    cors_origins_raw: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        validation_alias="CORS_ORIGINS",
    )
    # Vacío = en desarrollo se aceptan localhost y las IP privadas; en otro entorno, ninguna extra.
    cors_origin_regex_raw: str = Field(default="", validation_alias="CORS_ORIGIN_REGEX")
    # Carpeta con data/ y fixtures/ que lee `python -m app.seed`. Vacío = la carpeta app/ del repo.
    published_dir: str = Field(default="", validation_alias="PUBLISHED_DIR")
    # Opcional: carpeta con el build de la PWA (app/dist) para servirla desde la misma API.
    pwa_dist_dir: str = Field(default="", validation_alias="PWA_DIST_DIR")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        if self.cors_origin_regex_raw.strip():
            return self.cors_origin_regex_raw.strip()
        return _DEV_ORIGIN_REGEX if self.app_env == "development" else None

    @property
    def published_path(self) -> Path:
        return Path(self.published_dir) if self.published_dir.strip() else _REPO_ROOT / "app"

    @property
    def pwa_dist_path(self) -> Path | None:
        if not self.pwa_dist_dir.strip():
            return None
        path = Path(self.pwa_dist_dir)
        return path if (path / "index.html").is_file() else None


@lru_cache
def get_settings() -> Settings:
    return Settings()
