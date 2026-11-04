"""Audit log (feature 059): the @audited decorator and the store behind it."""

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId
from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.routing import APIRoute
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from app.core.exceptions import AppException, app_exception_handler
from app.main import app as main_app
from app.modules.audit.decorator import ACTION_ATTRIBUTE, audited
from app.modules.audit.dependencies import request_actor
from app.modules.audit.repository import AuditRepository
from app.modules.audit.schemas import AuditActor, AuditQuery, AuditResource, BotAuditQuery
from app.modules.audit.service import (
    ACTIVITY_RETENTION,
    RETENTION,
    AuditService,
    decode_cursor,
    encode_cursor,
    retention_for,
)
from app.modules.auth.schemas import CurrentUser
from app.modules.bots.schemas import BotCaller, BotKey, BotScope

ADMIN = AuditActor(kind="user", id="66d000000000000000000002", name="Admin")
EVENT_ID = "66d000000000000000000001"
TEAM_ID = "66d000000000000000000003"
NOW = datetime(2026, 11, 4, 12, tzinfo=UTC)


def stored(**changes: Any) -> dict[str, Any]:
    return {
        "_id": ObjectId(),
        "at": NOW,
        "expires_at": NOW + RETENTION,
        "action": "team.updated",
        "actor": ADMIN.model_dump(),
        "event_id": ObjectId(EVENT_ID),
        "team_id": None,
        "resource": {"type": "team", "id": TEAM_ID, "label": "Crabs"},
        "payload": {"name": "Crabs"},
        **changes,
    }


# --- store -------------------------------------------------------------------------------


def test_tile_activity_is_kept_30_days_everything_else_a_year() -> None:
    assert retention_for("activity.started") == ACTIVITY_RETENTION == timedelta(days=30)
    assert retention_for("submission.accepted") == RETENTION == timedelta(days=365)


def test_cursor_round_trip_and_invalid_cursor() -> None:
    entry_id = ObjectId()
    assert decode_cursor(encode_cursor(NOW, entry_id)) == (NOW, entry_id)
    with pytest.raises(AppException, match="Invalid cursor"):
        decode_cursor("nope")


async def test_record_stores_one_flat_document() -> None:
    repository = AsyncMock(spec=AuditRepository)

    await AuditService(repository).record(
        "team.updated",
        ADMIN,
        AuditResource(type="team", id=TEAM_ID, label="Crabs"),
        event_id=EVENT_ID,
        payload={"name": "Crabs"},
    )

    document = repository.insert.await_args.args[0]
    assert set(document) == {
        "_id",
        "at",
        "expires_at",
        "action",
        "actor",
        "event_id",
        "team_id",
        "resource",
        "payload",
    }
    assert document["event_id"] == ObjectId(EVENT_ID) and document["team_id"] is None
    assert document["expires_at"] - document["at"] == RETENTION
    assert document["at"].microsecond % 1000 == 0


async def test_admin_page_filters_and_next_cursor() -> None:
    repository = AsyncMock(spec=AuditRepository)
    documents = [stored(at=NOW - timedelta(minutes=minute)) for minute in range(3)]
    repository.find.return_value = documents
    query = AuditQuery.model_validate(
        {"event_id": EVENT_ID, "group": "submission", "actor": "Adm", "limit": 2}
    )

    page = await AuditService(repository).page(query)

    filters, cursor, limit = repository.find.await_args.args
    assert filters["event_id"] == ObjectId(EVENT_ID)
    assert filters["action"] == {"$regex": "^submission\\."}
    assert filters["actor.name"]["$regex"] == "Adm"
    assert cursor is None and limit == 3
    assert repository.find.await_args.kwargs == {"newest_first": True}
    assert len(page.items) == 2
    assert page.next_cursor == encode_cursor(documents[1]["at"], documents[1]["_id"])


async def test_bot_poll_goes_oldest_first_and_keeps_its_cursor_when_empty() -> None:
    repository = AsyncMock(spec=AuditRepository)
    newest = stored()
    repository.find.return_value = [newest]
    cursor = encode_cursor(NOW - timedelta(hours=1), ObjectId())

    page = await AuditService(repository).poll(BotAuditQuery(after=cursor))

    assert repository.find.await_args.args[1] == decode_cursor(cursor)
    assert repository.find.await_args.kwargs == {"newest_first": False}
    assert page.next_cursor == encode_cursor(newest["at"], newest["_id"])

    repository.find.return_value = []
    page = await AuditService(repository).poll(BotAuditQuery(after=cursor))
    assert page.items == [] and page.next_cursor == cursor


# --- actor -------------------------------------------------------------------------------


def request_with(user: CurrentUser | None, bot: BotCaller | None) -> Any:
    state = SimpleNamespace()
    if user is not None:
        state.current_user = user
    if bot is not None:
        state.bot_caller = bot
    return SimpleNamespace(state=state)


def test_actor_is_the_user_or_the_bot_acting_for_them() -> None:
    user = CurrentUser(id="u1", discord_id="1", username="Hal", is_admin=False)
    bot = BotCaller(
        key=BotKey(id="k1", name="clan-bot", scopes=frozenset({BotScope.SUBMISSIONS_WRITE})),
        acting_discord_id="1",
    )

    assert request_actor(request_with(user, None)) == AuditActor(kind="user", id="u1", name="Hal")
    assert request_actor(request_with(user, bot)) == AuditActor(
        kind="bot", id="k1", name="clan-bot", on_behalf_of="Hal"
    )
    assert request_actor(request_with(None, None)) is None


# --- decorator ---------------------------------------------------------------------------


class TeamUpdate(BaseModel):
    name: str
    token: str | None = None


class TeamResponse(BaseModel):
    id: str
    name: str
    event_id: str


def audited_app(insert: AsyncMock, fail_with: AppException | None = None) -> FastAPI:
    """A one-route app: the decorated handler behind a signed-in admin."""
    router = APIRouter()

    async def signed_in(request: Request) -> None:
        request.state.current_user = CurrentUser(
            id=ADMIN.id or "", discord_id="1", username="Admin", is_admin=True
        )

    @router.patch("/events/{event_id}/teams/{team_id}", dependencies=[Depends(signed_in)])
    @audited("team.updated", resource_id="team_id")
    async def update_team(event_id: str, team_id: str, payload: TeamUpdate) -> TeamResponse:
        if fail_with is not None:
            raise fail_with
        return TeamResponse(id=team_id, name=payload.name, event_id=event_id)

    app = FastAPI()
    app.include_router(router)
    app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]
    collection = MagicMock(insert_one=insert)
    database = MagicMock()
    database.__getitem__.return_value = collection
    app.state.db_client = SimpleNamespace(database=database)
    return app


async def patch_team(app: FastAPI) -> Any:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.patch(
            f"/events/{EVENT_ID}/teams/{TEAM_ID}", json={"name": "Crabs", "token": "s3cret"}
        )


async def test_decorated_route_records_who_what_and_the_body_without_secrets() -> None:
    insert = AsyncMock()

    response = await patch_team(audited_app(insert))

    assert response.status_code == 200
    assert response.json()["name"] == "Crabs"
    document = insert.await_args.args[0]
    assert document["action"] == "team.updated"
    assert document["actor"]["name"] == "Admin"
    assert document["event_id"] == ObjectId(EVENT_ID)
    assert document["resource"] == {"type": "team", "id": TEAM_ID, "label": "Crabs"}
    assert document["payload"] == {"name": "Crabs"}


async def test_failed_actions_are_not_recorded() -> None:
    insert = AsyncMock()

    response = await patch_team(audited_app(insert, AppException(409, "Taken")))

    assert response.status_code == 409
    insert.assert_not_awaited()


async def test_a_failed_audit_write_never_changes_the_response() -> None:
    insert = AsyncMock(side_effect=RuntimeError("database down"))

    response = await patch_team(audited_app(insert))

    assert response.status_code == 200


# Changes nothing worth auditing: sign-out, lookups sent as POST and stats refreshes.
NOT_AUDITED = {
    ("POST", "/auth/logout"),
    ("POST", "/admin/wiki-images/resolve"),
    ("POST", "/admin/droptracker/match-preview"),
    ("POST", "/admin/estimates/preview"),
    ("POST", "/profile/me/accounts/{account_id}/refresh"),
    ("POST", "/profile/me/accounts/{account_id}/track"),
}


def app_routes(routes: list[Any], prefix: str = "") -> Iterator[tuple[str, APIRoute]]:
    """Every route with its full path; included routers are nested in this FastAPI version."""
    for route in routes:
        if isinstance(route, APIRoute):
            yield prefix + route.path, route
        elif hasattr(route, "original_router"):
            nested = prefix + route.include_context.prefix
            yield from app_routes(route.original_router.routes, nested)


def test_every_route_that_changes_data_is_audited() -> None:
    changing = [
        (method, path, route)
        for path, route in app_routes(main_app.routes)
        for method in route.methods & {"POST", "PUT", "PATCH", "DELETE"}
    ]
    missing = sorted(
        (method, path)
        for method, path, route in changing
        if (method, path) not in NOT_AUDITED and not hasattr(route.endpoint, ACTION_ATTRIBUTE)
    )
    assert len(changing) > len(NOT_AUDITED)
    assert missing == []
