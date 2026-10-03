from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from urllib.parse import parse_qs, urlparse

import pytest
from bson import ObjectId

from app.core.config import Settings
from app.core.exceptions import AppException
from app.modules.auth.repository import AuthRepository
from app.modules.auth.service import AuthService, DiscordClient, token_hash


def auth_service() -> tuple[AuthService, AsyncMock, AsyncMock]:
    repository = AsyncMock(spec=AuthRepository)
    discord = AsyncMock(spec=DiscordClient)
    settings = Settings(
        discord_client_id="123", discord_client_secret="secret", admin_discord_ids=["456"]
    )
    repository.upsert_user.return_value = {
        "_id": ObjectId(),
        "discord_id": "456",
        "username": "Crab",
    }
    discord.identity.return_value = ("456", "Crab")
    return AuthService(repository, discord, settings), repository, discord


async def test_login_uses_identify_and_persists_only_state_hash() -> None:
    service, repository, _ = auth_service()
    url, state = await service.start_login()
    query = parse_qs(urlparse(url).query)
    assert query["scope"] == ["identify"]
    assert query["state"] == [state]
    assert query["response_type"] == ["code"]
    saved_hash, expires = repository.save_state.call_args.args
    assert saved_hash == token_hash(state) and saved_hash != state
    assert expires > datetime.now(UTC)


async def test_callback_consumes_state_before_provider_and_hashes_session() -> None:
    service, repository, discord = auth_service()
    token = await service.complete_login("code", "state", "state")
    repository.consume_state.assert_awaited_once()
    discord.identity.assert_awaited_once_with("code")
    assert repository.save_session.call_args.args[0] == token_hash(token)
    assert repository.save_session.call_args.args[0] != token


@pytest.mark.parametrize("state,browser", [("", ""), ("state", "wrong"), ("state", "")])
async def test_browser_state_mismatch_rejected(state: str, browser: str) -> None:
    service, repository, discord = auth_service()
    with pytest.raises(AppException, match="Invalid login state"):
        await service.complete_login("code", state, browser)
    repository.consume_state.assert_not_awaited()
    discord.identity.assert_not_awaited()


async def test_expired_or_replayed_state_rejected() -> None:
    service, repository, discord = auth_service()
    repository.consume_state.return_value = False
    with pytest.raises(AppException, match="Invalid login state"):
        await service.complete_login("code", "state", "state")
    discord.identity.assert_not_awaited()


async def test_session_role_is_derived_from_database_and_logout_revokes_hash() -> None:
    service, repository, _ = auth_service()
    repository.session_user.return_value = {
        "_id": ObjectId(),
        "discord_id": "456",
        "username": "Crab",
    }
    repository.is_administrator.return_value = True
    assert (await service.current_user("token")).is_admin
    repository.session_user.return_value["discord_id"] = "789"
    repository.is_administrator.return_value = False
    assert not (await service.current_user("token")).is_admin
    await service.logout("token")
    repository.delete_session.assert_awaited_once_with(token_hash("token"))


async def test_missing_expired_session_rejected() -> None:
    service, repository, _ = auth_service()
    repository.session_user.return_value = None
    for token in [None, "expired"]:
        with pytest.raises(AppException, match="Authentication required"):
            await service.current_user(token)


async def test_repository_checks_expiration_even_before_ttl_cleanup() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.find_one = AsyncMock(return_value=None)
    collection.find_one_and_delete = AsyncMock(return_value=None)
    repository = AuthRepository(database)
    now = datetime.now(UTC)
    assert await repository.session_user("hash", now) is None
    collection.find_one.assert_awaited_once_with({"_id": "hash", "expires_at": {"$gt": now}})
    assert not await repository.consume_state("hash", now)
    collection.find_one_and_delete.assert_awaited_once_with(
        {"_id": "hash", "expires_at": {"$gt": now}}
    )


async def test_provider_exchanges_code_as_form_and_uses_identity_scope(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import httpx

    requests: list[httpx.Request] = []

    def provider(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "provider-token"})
        return httpx.Response(200, json={"id": "456", "username": "Crab"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(provider))
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: client)
    identity = await DiscordClient(
        Settings(discord_client_id="123", discord_client_secret="secret")
    ).identity("code")
    assert identity == ("456", "Crab")
    assert requests[0].headers["content-type"] == "application/x-www-form-urlencoded"
    assert b"grant_type=authorization_code" in requests[0].content
    assert requests[1].headers["authorization"] == "Bearer provider-token"


async def test_provider_failure_is_generic_and_creates_no_session() -> None:
    service, repository, discord = auth_service()
    discord.identity.side_effect = AppException(502, "Discord login failed")
    with pytest.raises(AppException, match="Discord login failed"):
        await service.complete_login("code", "state", "state")
    repository.save_session.assert_not_awaited()


async def test_missing_provider_configuration_fails_closed() -> None:
    repository, discord = AsyncMock(spec=AuthRepository), AsyncMock(spec=DiscordClient)
    service = AuthService(
        repository, discord, Settings(discord_client_id="", discord_client_secret="")
    )
    with pytest.raises(AppException, match="not configured"):
        await service.start_login()
    repository.save_state.assert_not_awaited()


def test_oauth_callback_access_log_redacts_query() -> None:
    import logging

    from app.core.logging import OAuthAccessLogFilter

    record = logging.LogRecord(
        "uvicorn.access",
        20,
        "",
        0,
        '%s - "%s %s HTTP/%s" %d',
        ("client", "GET", "/auth/discord/callback?code=secret-code&state=secret-state", "1.1", 303),
        None,
    )
    assert OAuthAccessLogFilter().filter(record)
    assert "secret-code" not in record.getMessage()
    assert "secret-state" not in record.getMessage()
    assert "/auth/discord/callback" in record.getMessage()
