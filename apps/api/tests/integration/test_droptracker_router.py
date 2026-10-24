from datetime import UTC, datetime
from unittest.mock import AsyncMock

from httpx import AsyncClient

from app.main import app
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import CurrentUser
from app.modules.droptracker.router import get_droptracker_service
from app.modules.droptracker.schemas import DropPage, DropTrackerStatus


async def test_droptracker_feed_is_admin_only(client: AsyncClient) -> None:
    auth, service = AsyncMock(), AsyncMock()
    auth.current_user.return_value = CurrentUser(
        id="66d000000000000000000002", discord_id="1", username="felps_", is_admin=True
    )
    service.status.return_value = DropTrackerStatus(
        ingest_enabled=True,
        bingo_enabled=False,
        group_id=126,
        poll_seconds=300,
        key_configured=True,
        last_poll_at=datetime.now(UTC),
        last_success_at=None,
        last_error=None,
        newest_received_at=None,
        last_added=0,
        stored_drops=0,
    )
    service.drops.return_value = DropPage(items=[], total=0, offset=0, limit=50)

    async def provide_auth() -> AsyncMock:
        return auth

    async def provide_service() -> AsyncMock:
        return service

    app.dependency_overrides[get_auth_service] = provide_auth
    app.dependency_overrides[get_droptracker_service] = provide_service
    try:
        status = await client.get("/admin/droptracker/status")
        drops = await client.get("/admin/droptracker/drops", params={"item": "claw"})
        assert status.status_code == 200 and status.json()["group_id"] == 126
        assert drops.status_code == 200
        assert service.drops.await_args.args[0].item == "claw"

        auth.current_user.return_value = CurrentUser(
            id="66d000000000000000000003", discord_id="2", username="p", is_admin=False
        )
        assert (await client.get("/admin/droptracker/status")).status_code == 403
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_droptracker_service, None)
