"""Audit log routes (feature 059): admins on the site, bots with `audit:read`."""

from collections.abc import Iterator
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.main import app
from app.modules.audit.dependencies import get_audit_service
from app.modules.audit.schemas import AuditPage
from app.modules.auth.dependencies import require_user
from app.modules.auth.schemas import CurrentUser
from app.modules.bots import dependencies as bot_dependencies
from app.modules.bots.schemas import BotKey, BotScope

BEARER = {"Authorization": "Bearer secret-key"}


def user(is_admin: bool) -> CurrentUser:
    return CurrentUser(
        id="66d000000000000000000002", discord_id="1", username="Hal", is_admin=is_admin
    )


@pytest.fixture
def audit() -> Iterator[AsyncMock]:
    service = AsyncMock()
    service.page.return_value = AuditPage(items=[], next_cursor=None)
    service.poll.return_value = AuditPage(items=[], next_cursor="1.66d000000000000000000001")
    app.dependency_overrides[get_audit_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_audit_service, None)


def signed_in(is_admin: bool) -> None:
    app.dependency_overrides[require_user] = lambda: user(is_admin)


@pytest.fixture(autouse=True)
def clear_user() -> Iterator[None]:
    yield
    app.dependency_overrides.pop(require_user, None)


def bot_with(monkeypatch: pytest.MonkeyPatch, *scopes: BotScope) -> None:
    keys = AsyncMock()
    keys.authenticate.return_value = BotKey(id="k1", name="clan-bot", scopes=frozenset(scopes))
    monkeypatch.setattr(bot_dependencies, "get_bot_key_service", lambda _request: keys)


async def test_admin_reads_the_audit_log_with_filters(
    client: AsyncClient, audit: AsyncMock
) -> None:
    signed_in(is_admin=True)

    response = await client.get(
        "/admin/audit", params={"group": "submission", "from": "2026-11-01T00:00:00Z"}
    )

    assert response.status_code == 200
    assert response.json() == {"items": [], "next_cursor": None}
    query = audit.page.await_args.args[0]
    assert query.group == "submission" and query.since.day == 1


async def test_players_cannot_read_the_audit_log(client: AsyncClient, audit: AsyncMock) -> None:
    signed_in(is_admin=False)

    response = await client.get("/admin/audit")

    assert response.status_code == 403
    audit.page.assert_not_awaited()


async def test_website_users_cannot_use_the_bot_feed(client: AsyncClient, audit: AsyncMock) -> None:
    signed_in(is_admin=True)

    response = await client.get("/bot/audit")

    assert response.status_code == 403
    audit.poll.assert_not_awaited()


async def test_bot_with_audit_read_polls_after_its_cursor(
    client: AsyncClient, audit: AsyncMock, monkeypatch: pytest.MonkeyPatch
) -> None:
    bot_with(monkeypatch, BotScope.AUDIT_READ)

    response = await client.get(
        "/bot/audit", params={"after": "5.66d000000000000000000001"}, headers=BEARER
    )

    assert response.status_code == 200
    assert response.json()["next_cursor"] == "1.66d000000000000000000001"
    assert audit.poll.await_args.args[0].after == "5.66d000000000000000000001"


async def test_bot_without_audit_read_is_refused(
    client: AsyncClient, audit: AsyncMock, monkeypatch: pytest.MonkeyPatch
) -> None:
    bot_with(monkeypatch, BotScope.BOARDS_READ)

    response = await client.get("/bot/audit", headers=BEARER)

    assert response.status_code == 403
    audit.poll.assert_not_awaited()
