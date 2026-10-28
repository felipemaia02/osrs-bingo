import contextlib
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from pydantic import ValidationError

from app.core.config import Settings
from app.core.exceptions import AppException, NotFoundError
from app.core.storage import LocalScreenshotStorage
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.repository import BoardRepository
from app.modules.events.repository import EventRepository
from app.modules.players.repository import PlayerRepository
from app.modules.submissions.images import PNG_SIGNATURE, sniff_image_type
from app.modules.submissions.repository import SubmissionRepository
from app.modules.submissions.schemas import (
    RejectionReason,
    SubmissionKind,
    SubmissionReject,
    SubmissionStatus,
)
from app.modules.submissions.service import SubmissionService
from app.modules.teams.repository import TeamRepository

NOW = datetime.now(UTC)
EVENT_ID = ObjectId()
USER = CurrentUser(id=str(ObjectId()), discord_id="1", username="Holy Hal", is_admin=False)
ADMIN = CurrentUser(id=str(ObjectId()), discord_id="2", username="felps_", is_admin=True)
PLAYER_ID = ObjectId()
TEAM_ID = ObjectId()
PNG = PNG_SIGNATURE + b"\x00" * 64

VORKATH_DROPS = [
    {"key": "skeletal-visage", "name": "Skeletal Visage", "progress_weight": 2},
    {"key": "vorkaths-head", "name": "Vorkath's Head", "progress_weight": 1},
]


def card(name: str, requires: bool) -> dict[str, Any]:
    return {
        "card_id": str(ObjectId()),
        "card_revision": 3,
        "name": name,
        "drops": VORKATH_DROPS,
        "requires_preverification": requires,
        "rule_note": "Screenshot your kill count before the event" if requires else None,
    }


def board() -> dict[str, Any]:
    return {
        "event_id": EVENT_ID,
        "status": "published",
        "positions": [
            {"position": 1, "row": 1, "column": 1, "card": card("Vorkath", False)},
            {"position": 2, "row": 1, "column": 2, "card": card("Theatre of Blood", True)},
        ],
    }


def event(status: str = "active") -> dict[str, Any]:
    return {
        "_id": EVENT_ID,
        "name": "Autumn Bingo",
        "status": status,
        "start_at": NOW - timedelta(days=1),
        "end_at": NOW + timedelta(days=13),
    }


def player(status: str = "approved", team: ObjectId | None = TEAM_ID) -> dict[str, Any]:
    return {"_id": PLAYER_ID, "status": status, "team_id": team, "display_name": "Holy Hal"}


@pytest.fixture
def deps(tmp_path: Path) -> dict[str, Any]:
    submissions = AsyncMock(spec=SubmissionRepository)
    submissions.insert.return_value = True
    submissions.preverification_statuses.return_value = {}
    events = AsyncMock(spec=EventRepository)
    events.get.return_value = event()
    players = AsyncMock(spec=PlayerRepository)
    # The submitting player is registered; the reviewing admin isn't (unless a test says so).
    players.get_for_user.side_effect = lambda _event, user_id: (
        player() if user_id == USER.id else None
    )
    boards = AsyncMock(spec=BoardRepository)
    boards.get_by_event.return_value = board()
    teams = AsyncMock(spec=TeamRepository)
    storage = LocalScreenshotStorage(tmp_path)
    service = SubmissionService(
        submissions, events, players, teams, boards, storage, Settings(max_screenshot_bytes=1024)
    )
    return {
        "service": service,
        "submissions": submissions,
        "events": events,
        "players": players,
        "tmp": tmp_path,
    }


async def submit(
    deps: dict[str, Any],
    kind: SubmissionKind = SubmissionKind.DROP,
    position: int = 1,
    drop_key: str | None = "skeletal-visage",
    data: bytes = PNG,
) -> Any:
    return await deps["service"].submit(
        str(EVENT_ID), USER, kind, position, drop_key, "  first  try ", data
    )


def stored_files(deps: dict[str, Any]) -> list[Path]:
    return [path for path in Path(deps["tmp"]).rglob("*") if path.is_file()]


async def test_drop_submission_stores_screenshot_and_scoring_fields(deps: dict[str, Any]) -> None:
    result = await submit(deps)

    document = deps["submissions"].insert.await_args.args[0]
    assert result.status == SubmissionStatus.PENDING
    assert (document["team_id"], document["player_id"]) == (TEAM_ID, PLAYER_ID)
    assert (document["drop_key"], document["progress_weight"], document["quantity"]) == (
        "skeletal-visage",
        2.0,
        1,
    )
    assert document["card_revision"] == 3 and document["note"] == "first try"
    assert document["screenshot_key"].startswith(f"events/{EVENT_ID}/submissions/")
    assert "preverification_gate" not in document
    assert len(stored_files(deps)) == 1


@pytest.mark.parametrize(
    ("event_status", "registration", "status_code"),
    [
        ("draft", player(), 409),
        ("finished", player(), 409),
        ("active", player(status="pending"), 403),
        ("active", player(team=None), 403),
        ("active", None, 403),
    ],
)
async def test_only_approved_players_with_a_team_submit_during_active_events(
    deps: dict[str, Any], event_status: str, registration: Any, status_code: int
) -> None:
    deps["events"].get.return_value = event(event_status)
    deps["players"].get_for_user.side_effect = None
    deps["players"].get_for_user.return_value = registration

    with pytest.raises(AppException) as error:
        await submit(deps)

    assert error.value.status_code == status_code
    deps["submissions"].insert.assert_not_awaited()
    assert stored_files(deps) == []


async def test_drop_must_belong_to_the_chosen_card(deps: dict[str, Any]) -> None:
    with pytest.raises(AppException, match="not accepted by this card"):
        await submit(deps, drop_key="dragon-axe")
    with pytest.raises(AppException, match="Choose the item"):
        await submit(deps, drop_key=None)
    with pytest.raises(AppException, match="position not found"):
        await submit(deps, position=9)


async def test_gated_card_needs_a_sent_preverification_before_drops(deps: dict[str, Any]) -> None:
    with pytest.raises(AppException, match="pre-verification first"):
        await submit(deps, position=2)

    deps["submissions"].preverification_statuses.return_value = {(PLAYER_ID, 2): "rejected"}
    with pytest.raises(AppException, match="pre-verification first"):
        await submit(deps, position=2)

    deps["submissions"].preverification_statuses.return_value = {(PLAYER_ID, 2): "pending"}
    result = await submit(deps, position=2)
    assert result.card_name == "Theatre of Blood"


async def test_preverification_rules(deps: dict[str, Any]) -> None:
    with pytest.raises(AppException, match="doesn't require"):
        await submit(deps, kind=SubmissionKind.PREVERIFICATION, position=1, drop_key=None)

    result = await submit(deps, kind=SubmissionKind.PREVERIFICATION, position=2, drop_key=None)
    document = deps["submissions"].insert.await_args.args[0]
    assert result.drop_key is None and result.progress_weight is None
    assert document["preverification_gate"] == f"{EVENT_ID}:{PLAYER_ID}:2"
    assert result.preverification_note == "Screenshot your kill count before the event"

    deps["submissions"].preverification_statuses.return_value = {(PLAYER_ID, 2): "accepted"}
    with pytest.raises(AppException, match="already pending or accepted"):
        await submit(deps, kind=SubmissionKind.PREVERIFICATION, position=2, drop_key=None)


async def test_concurrent_duplicate_preverification_is_refused(deps: dict[str, Any]) -> None:
    deps["submissions"].insert.return_value = False
    with pytest.raises(AppException, match="already pending or accepted"):
        await submit(deps, kind=SubmissionKind.PREVERIFICATION, position=2, drop_key=None)


@pytest.mark.parametrize(
    ("data", "status_code"),
    [(b"hello, not an image", 422), (b"", 422), (PNG + b"\x00" * 2048, 413)],
)
async def test_screenshots_are_checked_from_their_content(
    deps: dict[str, Any], data: bytes, status_code: int
) -> None:
    with pytest.raises(AppException) as error:
        await submit(deps, data=data)
    assert error.value.status_code == status_code
    assert stored_files(deps) == []


def test_image_sniffing() -> None:
    assert sniff_image_type(PNG) == "image/png"
    assert sniff_image_type(b"\xff\xd8\xff\xe0rest") == "image/jpeg"
    assert sniff_image_type(b"RIFF\x00\x00\x00\x00WEBPVP8 ") == "image/webp"
    assert sniff_image_type(b"RIFF\x00\x00\x00\x00WAVE") is None


def pending(kind: str = "drop", requires: bool = True) -> dict[str, Any]:
    return {
        "_id": ObjectId(),
        "event_id": EVENT_ID,
        "player_id": PLAYER_ID,
        "user_id": ObjectId(USER.id),
        "position": 2,
        "kind": kind,
        "status": "pending",
        "drop_key": "skeletal-visage" if kind == "drop" else None,
        "requires_preverification": requires,
        "screenshot_key": "events/x/submissions/y.png",
        "screenshot_type": "image/png",
    }


async def test_gated_drop_is_accepted_only_after_its_preverification(
    deps: dict[str, Any],
) -> None:
    deps["submissions"].get.return_value = pending()
    deps["submissions"].preverification_statuses.return_value = {(PLAYER_ID, 2): "pending"}
    with pytest.raises(AppException, match="pre-verification for the card first"):
        await deps["service"].accept("id", ADMIN)
    deps["submissions"].review.assert_not_awaited()

    deps["submissions"].preverification_statuses.return_value = {(PLAYER_ID, 2): "accepted"}
    deps["submissions"].review.return_value = None
    with pytest.raises(AppException, match="already reviewed"):
        await deps["service"].accept("id", ADMIN)
    assert deps["submissions"].review.await_args.args[1:4] == (
        SubmissionStatus.ACCEPTED,
        ADMIN.id,
        ADMIN.username,
    )


async def test_review_needs_a_pending_submission_of_an_active_or_finished_event(
    deps: dict[str, Any],
) -> None:
    deps["submissions"].get.return_value = {**pending(), "status": "accepted"}
    with pytest.raises(AppException, match="already reviewed"):
        await deps["service"].accept("id", ADMIN)

    deps["submissions"].get.return_value = pending(kind="preverification")
    deps["events"].get.return_value = event("draft")
    with pytest.raises(AppException, match="active or finished"):
        await deps["service"].reject(
            "id", SubmissionReject(reason=RejectionReason.UNREADABLE_SCREENSHOT), ADMIN
        )


def test_rejecting_with_other_needs_a_note() -> None:
    with pytest.raises(ValidationError):
        SubmissionReject(reason=RejectionReason.OTHER, note="   ")
    assert SubmissionReject(reason=RejectionReason.OTHER, note=" wrong  boss ").note == "wrong boss"


async def test_screenshots_are_only_visible_to_their_owner_and_admins(
    deps: dict[str, Any],
) -> None:
    document = pending()
    storage: LocalScreenshotStorage = deps["service"]._storage
    await storage.put(document["screenshot_key"], PNG, "image/png")
    deps["submissions"].get.return_value = document
    stranger = CurrentUser(id=str(ObjectId()), discord_id="3", username="x", is_admin=False)

    with pytest.raises(NotFoundError):
        await deps["service"].screenshot("id", stranger)
    assert await deps["service"].screenshot("id", USER) == (None, PNG, "image/png")
    assert (await deps["service"].screenshot("id", ADMIN))[1] == PNG


async def test_unwritable_local_storage_reports_storage_unavailable(tmp_path: Path) -> None:
    blocked = tmp_path / "blocked"
    blocked.write_text("a file, not a folder")
    storage = LocalScreenshotStorage(blocked)

    with pytest.raises(AppException) as error:
        await storage.put("events/e/submissions/s.png", b"png", "image/png")

    assert error.value.status_code == 503


async def test_admins_never_review_their_own_team(deps: dict[str, Any]) -> None:
    pending = {
        "_id": ObjectId(),
        "event_id": EVENT_ID,
        "player_id": PLAYER_ID,
        "team_id": TEAM_ID,
        "position": 1,
        "kind": "drop",
        "status": "pending",
        "drop_key": "skeletal-visage",
        "requires_preverification": False,
    }
    deps["submissions"].get.return_value = pending
    deps["players"].get_for_user.side_effect = None
    deps["players"].get_for_user.return_value = player()  # the admin plays on TEAM_ID

    with pytest.raises(AppException) as refused:
        await deps["service"].accept(str(pending["_id"]), ADMIN)
    assert refused.value.status_code == 403 and "another admin" in refused.value.detail
    deps["submissions"].review.assert_not_awaited()

    deps["players"].get_for_user.return_value = player(team=ObjectId())  # another team
    deps["submissions"].review.return_value = {**pending, "status": "accepted"}
    with contextlib.suppress(Exception):
        await deps["service"].accept(str(pending["_id"]), ADMIN)
    deps["submissions"].review.assert_awaited_once()


async def test_items_removed_from_a_fixed_card_cannot_be_accepted(deps: dict[str, Any]) -> None:
    """036: the square's card no longer accepts this drop."""
    document = {**pending(requires=False), "position": 1, "drop_key": "gone-item"}
    deps["submissions"].get.return_value = document

    with pytest.raises(AppException, match="no longer on this card"):
        await deps["service"].accept(str(document["_id"]), ADMIN)
    deps["submissions"].review.assert_not_awaited()
