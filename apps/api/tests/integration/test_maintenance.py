from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.exceptions import AppException
from app.main import app
from app.modules.auth.schemas import CurrentUser
from app.modules.events.router import get_event_service
from app.modules.maintenance import gate


@pytest.fixture
def maintenance(monkeypatch: pytest.MonkeyPatch) -> AsyncMock:
    monkeypatch.setattr(settings, "maintenance_mode", True)
    monkeypatch.setattr(settings, "maintenance_message", "Back at 20:00 UTC")
    auth = AsyncMock()
    auth.current_user.side_effect = AppException(401, "Authentication required")

    async def provide(_request: object) -> AsyncMock:
        return auth

    monkeypatch.setattr(gate, "get_auth_service", provide)
    events = AsyncMock()
    events.list.return_value = []

    async def provide_events() -> AsyncMock:
        return events

    app.dependency_overrides[get_event_service] = provide_events
    yield auth
    app.dependency_overrides.pop(get_event_service, None)


async def test_players_get_503_while_status_and_health_stay_open(
    client: AsyncClient, maintenance: AsyncMock
) -> None:
    blocked = await client.get("/events")
    status = await client.get("/status")
    health = await client.get("/health")

    assert blocked.status_code == 503
    assert blocked.json() == {"detail": "Maintenance in progress"}
    assert status.json() == {"maintenance": True, "message": "Back at 20:00 UTC"}
    assert health.status_code == 200


async def test_admins_keep_using_the_api(client: AsyncClient, maintenance: AsyncMock) -> None:
    maintenance.current_user.side_effect = None
    maintenance.current_user.return_value = CurrentUser(
        id="66d000000000000000000002", discord_id="1", username="felps_", is_admin=True
    )

    assert (await client.get("/events")).status_code == 200


async def test_nothing_changes_when_maintenance_is_off(client: AsyncClient) -> None:
    assert (await client.get("/status")).json() == {"maintenance": False, "message": None}
