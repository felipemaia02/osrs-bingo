from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import AppException
from app.modules.auth.service import token_hash
from app.modules.bots.repository import BotKeyRepository
from app.modules.bots.schemas import BotScope
from app.modules.bots.service import BotKeyService

KEY_ID = "66d0000000000000000000b1"


def service() -> tuple[BotKeyService, AsyncMock]:
    repository = AsyncMock(spec=BotKeyRepository)
    repository.insert.return_value = True
    return BotKeyService(repository), repository


async def test_create_stores_only_the_hash_and_returns_the_key_once() -> None:
    keys, repository = service()

    key, plain = await keys.create(" clan-bot ", {BotScope.SCORE_READ, BotScope.BOARDS_READ})

    document = repository.insert.await_args.args[0]
    assert key.name == "clan-bot"
    assert key.scopes == {BotScope.SCORE_READ, BotScope.BOARDS_READ}
    assert len(plain) >= 43
    assert document["key_hash"] == token_hash(plain)
    assert plain not in document.values()
    assert document["revoked_at"] is None


@pytest.mark.parametrize(
    ("name", "scopes", "message"),
    [("  ", {BotScope.BOARDS_READ}, "needs a name"), ("bot", set(), "at least one scope")],
)
async def test_create_needs_a_name_and_a_scope(
    name: str, scopes: set[BotScope], message: str
) -> None:
    keys, repository = service()
    with pytest.raises(ValueError, match=message):
        await keys.create(name, scopes)
    repository.insert.assert_not_awaited()


async def test_create_refuses_a_name_already_in_use() -> None:
    keys, repository = service()
    repository.insert.return_value = False
    with pytest.raises(ValueError, match="already exists"):
        await keys.create("clan-bot", {BotScope.BOARDS_READ})


async def test_authenticate_looks_the_key_up_by_hash() -> None:
    keys, repository = service()
    repository.find_active.return_value = {
        "_id": KEY_ID,
        "name": "clan-bot",
        "scopes": ["teams:read"],
    }

    key = await keys.authenticate("Bearer secret-key")

    assert (key.id, key.name, key.scopes) == (KEY_ID, "clan-bot", frozenset({BotScope.TEAMS_READ}))
    assert repository.find_active.await_args.args[0] == token_hash("secret-key")


@pytest.mark.parametrize("header", ["", "Bearer ", "Bearer    ", "Basic abc", "bearer abc"])
async def test_malformed_headers_are_refused_without_a_lookup(header: str) -> None:
    keys, repository = service()
    with pytest.raises(AppException) as error:
        await keys.authenticate(header)
    assert error.value.status_code == 401
    assert error.value.headers == {"WWW-Authenticate": "Bearer"}
    repository.find_active.assert_not_awaited()


async def test_unknown_or_revoked_keys_are_refused() -> None:
    keys, repository = service()
    repository.find_active.return_value = None
    with pytest.raises(AppException, match="Invalid bot key") as error:
        await keys.authenticate("Bearer revoked")
    assert error.value.status_code == 401


async def test_revoke_by_name() -> None:
    keys, repository = service()
    repository.revoke.return_value = True
    assert await keys.revoke("clan-bot")
    assert repository.revoke.await_args.args[0] == "clan-bot"
