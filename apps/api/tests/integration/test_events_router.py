from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from fastapi import status
from httpx import AsyncClient

from app.main import app
from app.modules.auth.dependencies import require_admin
from app.modules.auth.schemas import CurrentUser
from app.modules.events.router import get_event_service
from app.modules.events.schemas import EventListResponse, EventResponse, EventStatus


@pytest.fixture(autouse=True)
def authenticated_admin():
    async def admin():
        return CurrentUser(
            id="66d000000000000000000002", discord_id="123", username="Admin", is_admin=True
        )

    app.dependency_overrides[require_admin] = admin
    yield
    app.dependency_overrides.pop(require_admin, None)


NOW = datetime(2026, 8, 30, 12, tzinfo=UTC)


def event_response(status_value: EventStatus = EventStatus.DRAFT) -> EventResponse:
    return EventResponse(
        id="66d000000000000000000001",
        name="Summer Bingo",
        description=None,
        start_at=NOW,
        end_at=NOW + timedelta(days=7),
        status=status_value,
        created_at=NOW,
        updated_at=NOW,
    )


async def test_create_event_contract(client: AsyncClient) -> None:
    service = AsyncMock()
    service.create.return_value = event_response()

    async def override_service() -> AsyncMock:
        return service

    app.dependency_overrides[get_event_service] = override_service
    try:
        response = await client.post(
            "/events",
            json={
                "name": "Summer Bingo",
                "start_at": NOW.isoformat(),
                "end_at": (NOW + timedelta(days=7)).isoformat(),
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["status"] == "draft"


async def test_list_events_passes_status_filter(client: AsyncClient) -> None:
    service = AsyncMock()
    service.list.return_value = [event_response(EventStatus.ACTIVE)]

    async def override_service() -> AsyncMock:
        return service

    app.dependency_overrides[get_event_service] = override_service
    try:
        response = await client.get("/events?status=active")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_200_OK
    assert EventListResponse.model_validate(response.json()).items[0].status is EventStatus.ACTIVE
    service.list.assert_awaited_once_with(EventStatus.ACTIVE)


async def test_invalid_schedule_returns_validation_error(client: AsyncClient) -> None:
    service = AsyncMock()

    async def override_service() -> AsyncMock:
        return service

    app.dependency_overrides[get_event_service] = override_service
    try:
        response = await client.post(
            "/events",
            json={"name": "Invalid", "start_at": NOW.isoformat(), "end_at": NOW.isoformat()},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
