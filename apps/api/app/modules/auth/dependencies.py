from typing import Annotated

from fastapi import Depends, Request

from app.core.config import settings
from app.core.exceptions import AppException
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import AuthService, DiscordClient
from app.modules.bots.dependencies import BotCallerDependency
from app.modules.security.dependencies import RequestLimiterDependency

SESSION_COOKIE = "osrs_session"
STATE_COOKIE = "osrs_oauth_state"
# The authenticated user, kept on the request for the audit log (feature 059).
CURRENT_USER_STATE = "current_user"


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
    bot: BotCallerDependency,
) -> CurrentUser:
    if bot is None:
        user = await service.current_user(request.cookies.get(SESSION_COOKIE))
        await require_trusted_origin(request)
    else:
        # A bot key in a header can't be sent by another site: no origin check (feature 048).
        if bot.acting_discord_id is None:
            raise AppException(403, "Bot key not allowed on this route")
        user = await service.acting_user(bot.acting_discord_id)
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        await limiter.check("mutation", user.id, settings.mutation_requests_per_minute)
    setattr(request.state, CURRENT_USER_STATE, user)
    return user


UserDependency = Annotated[CurrentUser, Depends(require_user)]


async def require_admin(user: UserDependency) -> CurrentUser:
    if not user.is_admin:
        raise AppException(403, "Administrator access required")
    return user


AdminDependency = Annotated[CurrentUser, Depends(require_admin)]
