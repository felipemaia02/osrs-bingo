from typing import Annotated

from fastapi import Depends, Request

from app.core.config import settings
from app.core.exceptions import AppException
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import AuthService, DiscordClient
from app.modules.security.dependencies import RequestLimiterDependency

SESSION_COOKIE = "osrs_session"
STATE_COOKIE = "osrs_oauth_state"


async def get_auth_service(request: Request) -> AuthService:
    return AuthService(
        AuthRepository(request.app.state.db_client.database), DiscordClient(settings), settings
    )


AuthServiceDependency = Annotated[AuthService, Depends(get_auth_service)]


async def require_trusted_origin(request: Request) -> None:
    if request.method not in {"GET", "HEAD", "OPTIONS"} and request.headers.get(
        "origin"
    ) != settings.frontend_url.rstrip("/"):
        raise AppException(403, "Untrusted request origin")


async def require_user(
    request: Request,
    service: AuthServiceDependency,
    limiter: RequestLimiterDependency,
) -> CurrentUser:
    user = await service.current_user(request.cookies.get(SESSION_COOKIE))
    await require_trusted_origin(request)
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        await limiter.check("mutation", user.id, settings.mutation_requests_per_minute)
    return user


UserDependency = Annotated[CurrentUser, Depends(require_user)]


async def require_admin(user: UserDependency) -> CurrentUser:
    if not user.is_admin:
        raise AppException(403, "Administrator access required")
    return user


AdminDependency = Annotated[CurrentUser, Depends(require_admin)]
