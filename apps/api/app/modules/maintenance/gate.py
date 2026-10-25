"""Maintenance mode (feature 028): the API answers only admins while it's on."""

from fastapi import Request

from app.core.config import settings
from app.core.exceptions import AppException
from app.modules.auth.dependencies import SESSION_COOKIE, get_auth_service

MAINTENANCE_DETAIL = "Maintenance in progress"
SERVICE_UNAVAILABLE = 503
# Liveness, the public status and the login flow stay open so admins can get in.
OPEN_PATHS = frozenset(
    {
        "/health",
        "/status",
        "/auth/discord/login",
        "/auth/discord/callback",
        "/auth/logout",
        "/auth/me",
    }
)


async def maintenance_gate(request: Request) -> None:
    """App-wide dependency: refuses everyone but logged-in admins during maintenance.
    The session is only looked up while maintenance is on."""
    if not settings.maintenance_mode or request.url.path in OPEN_PATHS:
        return
    auth = await get_auth_service(request)
    try:
        user = await auth.current_user(request.cookies.get(SESSION_COOKIE))
    except AppException:
        user = None
    if user is None or not user.is_admin:
        raise AppException(SERVICE_UNAVAILABLE, MAINTENANCE_DETAIL)
