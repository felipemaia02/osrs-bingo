from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.logging import get_logger, log_event

logger = get_logger(__name__)


class AppException(Exception):
    def __init__(
        self, status_code: int, detail: str, headers: dict[str, str] | None = None
    ) -> None:
        self.headers = headers
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class NotFoundError(AppException):
    def __init__(self, resource: str) -> None:
        super().__init__(status_code=404, detail=f"{resource} not found")


class ConflictError(AppException):
    def __init__(self, detail: str) -> None:
        super().__init__(status_code=409, detail=detail)


class DomainValidationError(AppException):
    def __init__(self, detail: str) -> None:
        super().__init__(status_code=422, detail=detail)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    log_event(
        logger,
        30,
        "application_exception",
        path=request.url.path,
        status=exc.status_code,
        detail=exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers
    )
