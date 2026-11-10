import secrets
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId

from app.core.exceptions import AppException
from app.modules.auth.service import token_hash
from app.modules.bots.repository import BotKeyRepository
from app.modules.bots.schemas import BotKey, BotKeySummary, BotScope

BEARER_PREFIX = "Bearer "
KEY_BYTES = 32
INVALID_KEY = "Invalid bot key"
UNAUTHORIZED = 401


def invalid_key() -> AppException:
    return AppException(UNAUTHORIZED, INVALID_KEY, headers={"WWW-Authenticate": "Bearer"})


class BotKeyService:
    def __init__(self, repository: BotKeyRepository) -> None:
        self._repository = repository

    async def create(self, name: str, scopes: set[BotScope]) -> tuple[BotKey, str]:
        """Returns the new key and its plain value, which is never stored or shown again."""
        name = name.strip()
        if not name:
            raise ValueError("A bot key needs a name")
        if not scopes:
            raise ValueError("A bot key needs at least one scope")
        plain = secrets.token_urlsafe(KEY_BYTES)
        document: dict[str, Any] = {
            "_id": ObjectId(),
            "name": name,
            "key_hash": token_hash(plain),
            "scopes": sorted(scopes),
            "created_at": datetime.now(UTC),
            "last_used_at": None,
            "revoked_at": None,
        }
        if not await self._repository.insert(document):
            raise ValueError(f"A bot key named {name!r} already exists")
        return self._to_key(document), plain

    async def authenticate(self, authorization: str) -> BotKey:
        if not authorization.startswith(BEARER_PREFIX):
            raise invalid_key()
        plain = authorization.removeprefix(BEARER_PREFIX).strip()
        if not plain:
            raise invalid_key()
        document = await self._repository.find_active(token_hash(plain), datetime.now(UTC))
        if document is None:
            raise invalid_key()
        return self._to_key(document)

    async def list(self) -> list[BotKeySummary]:
        return [
            BotKeySummary(
                **self._to_key(document).model_dump(),
                created_at=document["created_at"],
                last_used_at=document.get("last_used_at"),
                revoked_at=document.get("revoked_at"),
            )
            for document in await self._repository.list()
        ]

    async def grant(self, name: str, scopes: set[BotScope]) -> BotKey | None:
        """Adds scopes to an active key, keeping its secret (048 revision 2)."""
        if not scopes:
            raise ValueError("Grant at least one scope")
        document = await self._repository.add_scopes(name.strip(), sorted(scopes))
        return self._to_key(document) if document else None

    async def revoke(self, name: str) -> bool:
        return await self._repository.revoke(name, datetime.now(UTC))

    def _to_key(self, document: dict[str, Any]) -> BotKey:
        return BotKey(
            id=str(document["_id"]),
            name=document["name"],
            scopes=frozenset(BotScope(scope) for scope in document["scopes"]),
        )
