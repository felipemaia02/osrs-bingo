from collections.abc import Iterator
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.main import app
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import CurrentUser
from app.modules.submissions.router import get_submission_service
from app.modules.submissions.schemas import SubmissionKind, SubmissionResponse, SubmissionStatus

EVENT_ID = "66d000000000000000000001"
ORIGIN = {"Origin": "http://localhost:5173"}


def response() -> SubmissionResponse:
    return SubmissionResponse(
        id="66d0000000000000000000aa",
        event_id=EVENT_ID,
        kind=SubmissionKind.DROP,
        status=SubmissionStatus.PENDING,
        position=1,
        row=1,
        column=1,
        card_id="c",
        card_revision=1,
        card_name="Vorkath",
        drop_key="skeletal-visage",
        drop_name="Skeletal Visage",
        progress_weight=2,
        quantity=1,
        note=None,
        submitted_at=datetime.now(UTC),
        reviewed_at=None,
        reviewer_name=None,
        rejection_reason=None,
        rejection_note=None,
    )


@pytest.fixture
def services() -> Iterator[tuple[AsyncMock, AsyncMock]]:
    auth, submissions = AsyncMock(), AsyncMock()
    auth.current_user.return_value = CurrentUser(
        id="66d000000000000000000002", discord_id="1", username="Hal", is_admin=False
    )
    submissions.submit.return_value = response()
    submissions.screenshot.return_value = ("https://bucket.example/signed", None, "image/png")

    async def auth_override() -> AsyncMock:
        return auth

    async def submissions_override() -> AsyncMock:
        return submissions

    app.dependency_overrides[get_auth_service] = auth_override
    app.dependency_overrides[get_submission_service] = submissions_override
    try:
        yield auth, submissions
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides.pop(get_submission_service, None)


async def test_upload_route_accepts_screenshot_sized_multipart(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200_000
    result = await client.post(
        f"/events/{EVENT_ID}/submissions",
        data={"kind": "drop", "position": "1", "drop_key": "skeletal-visage"},
        files={"screenshot": ("proof.png", image, "image/png")},
        headers=ORIGIN,
    )

    assert result.status_code == 201
    args = services[1].submit.await_args.args
    assert args[0] == EVENT_ID and args[2] == SubmissionKind.DROP and args[3] == 1
    assert args[4] == "skeletal-visage" and args[6] == image


async def test_other_routes_keep_the_small_body_limit(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    result = await client.post(
        "/admin/submissions/x/reject",
        content=b"{" + b" " * 200_000 + b"}",
        headers={**ORIGIN, "Content-Type": "application/json"},
    )
    assert result.status_code == 413


async def test_upload_requires_a_trusted_origin(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    result = await client.post(
        f"/events/{EVENT_ID}/submissions",
        data={"kind": "drop", "position": "1"},
        files={"screenshot": ("proof.png", b"x", "image/png")},
        headers={"Origin": "https://evil.example"},
    )
    assert result.status_code == 403
    services[1].submit.assert_not_awaited()


async def test_screenshot_redirects_to_a_signed_url(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    result = await client.get("/submissions/abc/screenshot")
    assert result.status_code == 307
    assert result.headers["location"] == "https://bucket.example/signed"


async def test_review_routes_are_admin_only(
    client: AsyncClient, services: tuple[AsyncMock, AsyncMock]
) -> None:
    assert (await client.get(f"/admin/events/{EVENT_ID}/submissions")).status_code == 403
    assert (await client.post("/admin/submissions/x/accept", headers=ORIGIN)).status_code == 403
    services[1].accept.assert_not_awaited()
