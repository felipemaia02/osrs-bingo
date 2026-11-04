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
    ReviewQueueQuery,
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
REASON = RejectionReason.ITEM_MISMATCH
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


async def test_admins_review_their_team_but_never_their_own_submission(
    deps: dict[str, Any],
) -> None:
    """054 revises 026: teammates' submissions are fine, only the admin's own are refused."""
    pending = {
        "_id": ObjectId(),
        "event_id": EVENT_ID,
        "player_id": PLAYER_ID,
        "user_id": ObjectId(ADMIN.id),
        "team_id": TEAM_ID,
        "position": 1,
        "kind": "drop",
        "status": "pending",
        "drop_key": "skeletal-visage",
        "requires_preverification": False,
    }
    deps["submissions"].get.return_value = pending

    reject = SubmissionReject(reason=REASON)
    calls = [
        deps["service"].accept(str(pending["_id"]), ADMIN),
        deps["service"].reject(str(pending["_id"]), reject, ADMIN),
    ]
    for call in calls:
        with pytest.raises(AppException) as refused:
            await call
        assert refused.value.status_code == 403 and "your own submission" in refused.value.detail
    deps["submissions"].review.assert_not_awaited()

    # A teammate's submission (same team as the admin) is reviewed normally.
    deps["submissions"].get.return_value = {**pending, "user_id": ObjectId()}
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


async def test_bot_submissions_record_their_source_and_key(deps: dict[str, Any]) -> None:
    result = await deps["service"].submit(
        str(EVENT_ID), USER, SubmissionKind.DROP, 1, "skeletal-visage", None, PNG, "clan-bot"
    )

    document = deps["submissions"].insert.await_args.args[0]
    assert (document["source"], document["bot_key_name"]) == ("bot", "clan-bot")
    assert result.source == "bot"


async def test_site_submissions_keep_the_manual_source(deps: dict[str, Any]) -> None:
    result = await submit(deps)

    document = deps["submissions"].insert.await_args.args[0]
    assert "source" not in document and "bot_key_name" not in document
    assert result.source == "manual"


def droptracker_drop(**changes: Any) -> dict[str, Any]:
    """A pending automatic drop with no DropTracker image (feature 057)."""
    return {
        **pending(requires=False),
        "row": 1,
        "column": 2,
        "card_id": "vorkath",
        "card_revision": 1,
        "card_name": "Vorkath",
        "drop_name": "Skeletal Visage",
        "progress_weight": 1.0,
        "quantity": 1,
        "note": "Automatic · Vorkath · x1",
        "submitted_at": NOW,
        "source": "droptracker",
        "droptracker_drop_id": 1,
        "screenshot_key": "",
        "screenshot_url": None,
        **changes,
    }


async def test_player_adds_a_screenshot_to_their_droptracker_drop(deps: dict[str, Any]) -> None:
    document = droptracker_drop()
    deps["submissions"].get.return_value = document
    deps["submissions"].attach_screenshot.side_effect = lambda _id, key, kind, digest: {
        **document,
        "screenshot_key": key,
        "screenshot_type": kind,
        "screenshot_sha256": digest,
    }

    result = await deps["service"].attach_screenshot(str(document["_id"]), USER, PNG)

    _, key, kind, digest = deps["submissions"].attach_screenshot.await_args.args
    assert key.startswith(f"events/{EVENT_ID}/submissions/{document['_id']}-")
    assert kind == "image/png"
    assert [path.read_bytes() for path in stored_files(deps)] == [PNG]
    assert len(digest) == 64
    assert result.has_screenshot and result.screenshot_from_player
    assert result.status == SubmissionStatus.PENDING and result.submitted_at == NOW


@pytest.mark.parametrize(
    ("changes", "user", "error"),
    [
        ({}, ADMIN, NotFoundError),  # not the owner, even for admins
        ({"status": "accepted"}, USER, AppException),
        ({"screenshot_url": "https://droptracker.example/a.png"}, USER, AppException),
        ({"screenshot_key": "events/x/submissions/y.png"}, USER, AppException),
        ({"source": "manual"}, USER, AppException),
    ],
)
async def test_screenshots_are_only_added_to_own_pending_drops_without_one(
    deps: dict[str, Any], changes: dict[str, Any], user: CurrentUser, error: type[Exception]
) -> None:
    deps["submissions"].get.return_value = droptracker_drop(**changes)

    with pytest.raises(error) as raised:
        await deps["service"].attach_screenshot("id", user, PNG)

    assert raised.value.status_code == (404 if error is NotFoundError else 409)
    deps["submissions"].attach_screenshot.assert_not_awaited()
    assert not stored_files(deps)


async def test_adding_a_screenshot_needs_an_active_event_and_a_valid_image(
    deps: dict[str, Any],
) -> None:
    deps["submissions"].get.return_value = droptracker_drop()
    with pytest.raises(AppException):
        await deps["service"].attach_screenshot("id", USER, b"not an image")
    deps["events"].get.return_value = event("finished")
    with pytest.raises(AppException) as raised:
        await deps["service"].attach_screenshot("id", USER, PNG)
    assert raised.value.status_code == 409
    deps["submissions"].attach_screenshot.assert_not_awaited()


async def test_screenshot_reviewed_meanwhile_is_refused(deps: dict[str, Any]) -> None:
    deps["submissions"].get.return_value = droptracker_drop()
    deps["submissions"].attach_screenshot.return_value = None

    with pytest.raises(AppException) as raised:
        await deps["service"].attach_screenshot("id", USER, PNG)

    assert raised.value.status_code == 409


async def test_droptracker_drop_serves_the_screenshot_the_player_sent(
    deps: dict[str, Any],
) -> None:
    document = droptracker_drop(screenshot_key="events/x/submissions/z.png")
    await deps["service"]._storage.put(document["screenshot_key"], PNG, "image/png")
    deps["submissions"].get.return_value = document

    assert await deps["service"].screenshot("id", USER) == (None, PNG, "image/png")


# --- team reviewers (feature 064) -----------------------------------------------------------

REVIEWER = CurrentUser(id=str(ObjectId()), discord_id="3", username="Cap", is_admin=False)
OTHER_TEAM = ObjectId()


def reviewer_registration(role: str | None) -> dict[str, Any]:
    return {**player(), "_id": ObjectId(), "role": role}


def submission_of(team: ObjectId) -> dict[str, Any]:
    return {
        **pending(requires=False),
        "position": 1,
        "team_id": team,
        "card_name": "Vorkath",
        "drop_name": "Skeletal Visage",
    }


def as_reviewer(deps: dict[str, Any], role: str | None) -> None:
    def registration(_event: str, user_id: str) -> dict[str, Any] | None:
        if user_id == REVIEWER.id:
            return reviewer_registration(role)
        return player() if user_id == USER.id else None

    deps["players"].get_for_user.side_effect = registration


@pytest.mark.parametrize("role", ["captain", "reviewer"])
async def test_captains_and_reviewers_review_the_other_teams(
    deps: dict[str, Any], role: str
) -> None:
    as_reviewer(deps, role)
    deps["submissions"].get.return_value = submission_of(OTHER_TEAM)
    deps["submissions"].review.return_value = {**submission_of(OTHER_TEAM), "status": "accepted"}

    with contextlib.suppress(Exception):
        await deps["service"].accept("id", REVIEWER)

    deps["submissions"].review.assert_awaited_once()


async def test_reviewers_never_see_their_own_teams_submissions(deps: dict[str, Any]) -> None:
    as_reviewer(deps, "reviewer")
    deps["submissions"].get.return_value = submission_of(TEAM_ID)

    for action in (
        deps["service"].accept("id", REVIEWER),
        deps["service"].reject("id", SubmissionReject(reason=REASON), REVIEWER),
        deps["service"].tile_history("id", REVIEWER),
        deps["service"].screenshot("id", REVIEWER),
    ):
        with pytest.raises(NotFoundError):
            await action
    deps["submissions"].review.assert_not_awaited()


async def test_reviewer_queue_leaves_out_their_own_team(deps: dict[str, Any]) -> None:
    as_reviewer(deps, "captain")
    deps["submissions"].page.return_value = ([], 0)
    deps["submissions"].open_drops.return_value = []
    deps["submissions"].pending_counts.return_value = {}

    await deps["service"].queue(str(EVENT_ID), ReviewQueueQuery(), REVIEWER)

    assert deps["submissions"].page.await_args.kwargs["extra"] == {"team_id": {"$ne": TEAM_ID}}
    assert deps["submissions"].pending_counts.await_args.kwargs == {"exclude_team": TEAM_ID}


@pytest.mark.parametrize("role", [None, "unknown"])
async def test_players_without_a_review_role_are_refused(
    deps: dict[str, Any], role: str | None
) -> None:
    as_reviewer(deps, role)
    deps["submissions"].get.return_value = submission_of(OTHER_TEAM)

    with pytest.raises(AppException) as caught:
        await deps["service"].accept("id", REVIEWER)
    assert caught.value.status_code == 403
    with pytest.raises(NotFoundError):
        await deps["service"].screenshot("id", REVIEWER)
