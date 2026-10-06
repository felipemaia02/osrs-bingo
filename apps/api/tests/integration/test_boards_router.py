from collections.abc import Iterator
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.main import app
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.router import get_board_service
from app.modules.boards.schemas import BoardResponse, BoardStatus

EVENT_ID = "66d000000000000000000001"
NOW = datetime(2026, 10, 3, 18, tzinfo=UTC)


def board_response() -> BoardResponse:
    return BoardResponse(
        event_id=EVENT_ID,
        status=BoardStatus.DRAFT,
        revision=1,
        complete=False,
        positions=[],
        created_at=NOW,
        updated_at=NOW,
    )


@pytest.fixture
def services() -> Iterator[tuple[AsyncMock, AsyncMock]]:
    auth, boards = AsyncMock(), AsyncMock()
    auth.current_user.return_value = CurrentUser(
        id="admin", discord_id="123", username="Admin", is_admin=True
    )
    boards.get_public.return_value = board_response()
    boards.get_admin.return_value = board_response()
    boards.save.return_value = board_response()

    async def auth_override() -> AsyncMock:
        return auth

    async def board_override() -> AsyncMock:
        return boards

    app.dependency_overrides[get_auth_service] = auth_override
    app.dependency_overrides[get_board_service] = board_override
    try:
        yield auth, boards
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_board_service, None)


async def test_public_board_contract_has_no_authentication_requirement(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    response = await client.get(f"/events/{EVENT_ID}/board")

    assert response.status_code == 200
    assert response.json()["event_id"] == EVENT_ID
    services[1].get_public.assert_awaited_once_with(EVENT_ID)
    services[0].current_user.assert_not_awaited()


async def test_admin_can_save_draft_board(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    response = await client.put(
        f"/admin/events/{EVENT_ID}/board",
        json={"expected_revision": 0, "positions": []},
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.status_code == 200
    services[1].save.assert_awaited_once()
    assert services[1].save.await_args.args[0] == EVENT_ID
    assert services[1].save.await_args.args[1].expected_revision == 0
    assert services[1].save.await_args.args[2].is_admin is True


async def test_regular_user_cannot_read_or_change_draft_board(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    services[0].current_user.return_value.is_admin = False

    assert (await client.get(f"/admin/events/{EVENT_ID}/board")).status_code == 403
    assert (
        await client.put(
            f"/admin/events/{EVENT_ID}/board",
            json={"expected_revision": 0, "positions": []},
            headers={"Origin": "http://localhost:5173"},
        )
    ).status_code == 403
    services[1].get_admin.assert_not_awaited()
    services[1].save.assert_not_awaited()

