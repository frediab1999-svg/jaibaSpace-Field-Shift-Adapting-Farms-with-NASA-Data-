from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


async def database_error_handler(_: Request, exc: DBAPIError) -> JSONResponse:
    """La base no responde o falta aplicar las migraciones: 503 con el mismo formato de error."""
    return JSONResponse(
        status_code=503,
        content={
            "error": {
                "code": "database_not_ready",
                "message": "La base de datos no está disponible o falta `alembic upgrade head`.",
            }
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(DBAPIError, database_error_handler)
