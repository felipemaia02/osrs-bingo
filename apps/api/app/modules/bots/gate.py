"""Bot access (feature 048): the one place that decides which routes accept a bot key."""

import re
from dataclasses import dataclass

from fastapi import Request
from fastapi.routing import APIRoute

from app.core.config import settings
from app.core.exceptions import AppException
from app.modules.bots import dependencies
from app.modules.bots.dependencies import BOT_CALLER_STATE
from app.modules.bots.schemas import BotCaller, BotScope
from app.modules.security.dependencies import RequestLimiterDependency

ACTING_USER_HEADER = "x-acting-user"
# Discord IDs are snowflakes: up to 20 digits.
DISCORD_ID_PATTERN = re.compile(r"[0-9]{1,20}")
FORBIDDEN = 403
BAD_REQUEST = 400


@dataclass(frozen=True)
class BotRoute:
    scope: BotScope
    needs_acting_user: bool


ROUTE_SCOPES: dict[tuple[str, str], BotRoute] = {
    ("GET", "/events"): BotRoute(BotScope.EVENTS_READ, False),
    ("GET", "/events/{event_id}/board"): BotRoute(BotScope.BOARDS_READ, False),
    ("GET", "/events/{event_id}/teams"): BotRoute(BotScope.TEAMS_READ, False),
    ("GET", "/events/{event_id}/score/me"): BotRoute(BotScope.SCORE_READ, True),
    ("POST", "/events/{event_id}/submissions"): BotRoute(BotScope.SUBMISSIONS_WRITE, True),
    ("GET", "/bot/audit"): BotRoute(BotScope.AUDIT_READ, False),
}


def bot_route(request: Request) -> BotRoute | None:
    route = request.scope.get("route")
    if not isinstance(route, APIRoute):
        return None
    return ROUTE_SCOPES.get((request.method, route.path))


def acting_discord_id(request: Request) -> str:
    value = request.headers.get(ACTING_USER_HEADER, "").strip()
    if not value:
        raise AppException(BAD_REQUEST, "X-Acting-User header required")
    if not DISCORD_ID_PATTERN.fullmatch(value):
        raise AppException(BAD_REQUEST, "Invalid X-Acting-User header")
    return value


async def bot_gate(request: Request, limiter: RequestLimiterDependency) -> None:
    """App-wide dependency. A request with an Authorization header is a bot request: it's
    authenticated by its key only, and only the routes in ROUTE_SCOPES accept it."""
    authorization = request.headers.get("authorization")
    if authorization is None:
        return
    key = await dependencies.get_bot_key_service(request).authenticate(authorization)
    await limiter.check("bot", key.id, settings.bot_requests_per_minute)
    route = bot_route(request)
    if route is None or route.scope not in key.scopes:
        raise AppException(FORBIDDEN, "Bot key not allowed on this route")
    acting = acting_discord_id(request) if route.needs_acting_user else None
    setattr(request.state, BOT_CALLER_STATE, BotCaller(key=key, acting_discord_id=acting))
