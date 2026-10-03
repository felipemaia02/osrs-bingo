import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.config import Settings
from app.core.exceptions import AppException
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import CurrentUser

STATE_MAX_AGE = 600
SESSION_MAX_AGE = 7 * 24 * 60 * 60
DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize"
DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token"
DISCORD_USER_URL = "https://discord.com/api/v10/users/@me"


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class DiscordClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def identity(self, code: str) -> tuple[str, str]:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                token = await client.post(
                    DISCORD_TOKEN_URL,
                    data={
                        "client_id": self._settings.discord_client_id,
                        "client_secret": self._settings.discord_client_secret.get_secret_value(),
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": self._settings.discord_redirect_uri,
                    },
                )
                token.raise_for_status()
                access_token = token.json()["access_token"]
                response = await client.get(
                    DISCORD_USER_URL, headers={"Authorization": f"Bearer {access_token}"}
                )
                response.raise_for_status()
                user = response.json()
                discord_id, username = user["id"], user["username"]
                if (
                    not isinstance(discord_id, str)
                    or not discord_id.isdigit()
                    or not isinstance(username, str)
                ):
                    raise ValueError("Invalid Discord identity")
                return discord_id, username
        except (httpx.HTTPError, KeyError, ValueError, TypeError) as exc:
            raise AppException(502, "Discord login failed") from exc


class AuthService:
    def __init__(
        self, repository: AuthRepository, discord: DiscordClient, settings: Settings
    ) -> None:
        self._repository = repository
        self._discord = discord
        self._settings = settings

    async def start_login(self) -> tuple[str, str]:
        if (
            not self._settings.discord_client_id
            or not self._settings.discord_client_secret.get_secret_value()
        ):
            raise AppException(503, "Discord login is not configured")
        state = secrets.token_urlsafe(32)
        await self._repository.save_state(
            token_hash(state), datetime.now(UTC) + timedelta(seconds=STATE_MAX_AGE)
        )
        query = urlencode(
            {
                "client_id": self._settings.discord_client_id,
                "redirect_uri": self._settings.discord_redirect_uri,
                "response_type": "code",
                "scope": "identify",
                "state": state,
            }
        )
        return f"{DISCORD_AUTHORIZE_URL}?{query}", state

    async def complete_login(self, code: str, state: str, browser_state: str) -> str:
        if not state or not browser_state or not secrets.compare_digest(state, browser_state):
            raise AppException(400, "Invalid login state")
        now = datetime.now(UTC)
        if not await self._repository.consume_state(token_hash(state), now):
            raise AppException(400, "Invalid login state")
        discord_id, username = await self._discord.identity(code)
        user = await self._repository.upsert_user(discord_id, username, now)
        token = secrets.token_urlsafe(32)
        await self._repository.save_session(
            token_hash(token), user["_id"], now + timedelta(seconds=SESSION_MAX_AGE)
        )
        return token

    async def current_user(self, token: str | None) -> CurrentUser:
        if not token:
            raise AppException(401, "Authentication required")
        user = await self._repository.session_user(token_hash(token), datetime.now(UTC))
        if user is None:
            raise AppException(401, "Authentication required")
        return self._to_user(user, await self._repository.is_administrator(user["discord_id"]))

    async def logout(self, token: str | None) -> None:
        if token:
            await self._repository.delete_session(token_hash(token))

    def _to_user(self, user: dict[str, Any], is_admin: bool) -> CurrentUser:
        return CurrentUser(
            id=str(user["_id"]),
            discord_id=user["discord_id"],
            username=user["username"],
            is_admin=is_admin,
        )
