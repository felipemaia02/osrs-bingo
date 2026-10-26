from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import AppException
from app.modules.submissions.duplicates import possible_duplicates
from app.modules.submissions.schemas import (
    RejectionReason,
    ReviewQueueQuery,
    SubmissionReject,
    SubmissionStatus,
)
from tests.unit.test_submissions_service import (
    ADMIN,
    EVENT_ID,
    PLAYER_ID,
    TEAM_ID,
    deps,  # noqa: F401  (fixture)
    event,
    player,
    submit,
)

AT = datetime(2026, 10, 25, 12, tzinfo=UTC)


def drop(minutes: int = 0, **changes: Any) -> dict[str, Any]:
    return {
        "_id": ObjectId(),
        "event_id": EVENT_ID,
        "team_id": TEAM_ID,
        "player_id": PLAYER_ID,
        "user_id": ObjectId(),
        "kind": "drop",
        "status": "pending",
        "position": 3,
        "row": 1,
        "column": 3,
        "card_id": "barrows",
        "card_revision": 1,
        "card_name": "Barrows",
        "requires_preverification": False,
        "drop_key": "ahrims-piece",
        "drop_name": "Ahrim's Piece (any)",
        "progress_weight": 1.0,
        "quantity": 1,
        "note": None,
        "screenshot_key": "k",
        "screenshot_type": "image/png",
        "submitted_at": AT + timedelta(minutes=minutes),
        **changes,
    }


def test_same_player_item_and_tile_within_an_hour_is_a_possible_duplicate() -> None:
    manual = drop(0)
    automatic = drop(2, source="droptracker")
    later = drop(90, source="droptracker")
    other_item = drop(1, drop_key="karils-piece")

    found = possible_duplicates([manual, later], [manual, automatic, later, other_item])

    assert found == {manual["_id"]: [str(automatic["_id"])]}


def test_the_exact_same_screenshot_is_flagged_whatever_the_time() -> None:
    first = drop(0, screenshot_sha256="abc")
    copy = drop(600, screenshot_sha256="abc", position=7, drop_key="other")

    assert possible_duplicates([copy], [first, copy]) == {copy["_id"]: [str(first["_id"])]}


async def test_manual_submissions_store_the_screenshot_hash(deps: dict[str, Any]) -> None:  # noqa: F811
    await submit(deps)

    document = deps["submissions"].insert.await_args.args[0]
    assert len(document["screenshot_sha256"]) == 64


async def test_queue_flags_duplicates_and_shows_accepted_latest_first(
    deps: dict[str, Any],  # noqa: F811
) -> None:
    manual, automatic = drop(0), drop(3, source="droptracker")
    deps["submissions"].page.return_value = ([manual, automatic], 2)
    deps["submissions"].open_drops.return_value = [manual, automatic]
    deps["submissions"].pending_counts.return_value = {}
    deps["players"].get_many.return_value = {PLAYER_ID: player()}
    deps["players"].ids_named_like.return_value = [PLAYER_ID]
    deps["service"]._teams.list.return_value = []

    queue = await deps["service"].queue(str(EVENT_ID), ReviewQueueQuery(), ADMIN)
    assert queue.items[0].possible_duplicates == [str(automatic["_id"])]
    assert queue.items[1].possible_duplicates == [str(manual["_id"])]

    await deps["service"].queue(
        str(EVENT_ID), ReviewQueueQuery(status=SubmissionStatus.ACCEPTED, q=" ahrim "), ADMIN
    )
    kwargs = deps["submissions"].page.await_args.kwargs
    assert kwargs["newest_first"] is True
    assert {"player_id": {"$in": [PLAYER_ID]}} in kwargs["extra"]["$or"]


async def test_tile_history_lists_the_teams_other_drops_with_progress(
    deps: dict[str, Any],  # noqa: F811
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    current = drop(10)
    accepted = drop(5, status="accepted", source="droptracker")
    earlier = drop(-200, status="accepted", drop_key="karils-piece", drop_name="Karil's Piece")
    deps["submissions"].get.return_value = current
    deps["submissions"].tile_drops.return_value = [current, accepted, earlier]
    deps["players"].get_many.return_value = {PLAYER_ID: player()}
    deps["service"]._teams.get.return_value = {"_id": TEAM_ID, "name": "Saradomin"}
    progress = AsyncMock(return_value=(2.0, 12.0, False))
    monkeypatch.setattr("app.modules.submissions.service.ScoringService.tile_progress", progress)

    history = await deps["service"].tile_history(str(current["_id"]), ADMIN)

    assert (history.team_name, history.progress, history.requirement) == ("Saradomin", 2, 12)
    assert [item.id for item in history.items] == [str(accepted["_id"]), str(earlier["_id"])]
    assert history.items[0].same_item and history.items[0].possible_duplicate
    assert history.items[0].source == "droptracker"
    assert not history.items[1].same_item and not history.items[1].possible_duplicate


async def test_accepted_submissions_can_be_reverted_while_the_event_is_active(
    deps: dict[str, Any],  # noqa: F811
) -> None:
    accepted = drop(0, status="accepted")
    deps["submissions"].get.return_value = accepted
    deps["submissions"].revert.return_value = {
        **accepted,
        "status": "rejected",
        "rejection_reason": "duplicate",
        "reverted_at": AT,
    }
    reason = SubmissionReject(reason=RejectionReason.DUPLICATE)

    result = await deps["service"].revert(str(accepted["_id"]), reason, ADMIN)

    assert result.status == SubmissionStatus.REJECTED and result.reverted_at == AT
    assert deps["submissions"].revert.await_args.args[1:4] == (
        ADMIN.id,
        ADMIN.username,
        RejectionReason.DUPLICATE,
    )


@pytest.mark.parametrize(
    ("status", "event_status", "message"),
    [
        ("pending", "active", "Only accepted"),
        ("accepted", "finished", "while the event is active"),
    ],
)
async def test_revert_needs_an_accepted_submission_of_an_active_event(
    deps: dict[str, Any],  # noqa: F811
    status: str,
    event_status: str,
    message: str,
) -> None:
    deps["submissions"].get.return_value = drop(0, status=status)
    deps["events"].get.return_value = event(event_status)

    with pytest.raises(AppException, match=message):
        await deps["service"].revert(
            "id", SubmissionReject(reason=RejectionReason.DUPLICATE), ADMIN
        )
    deps["submissions"].revert.assert_not_awaited()


async def test_admins_never_revert_their_own_team(deps: dict[str, Any]) -> None:  # noqa: F811
    deps["submissions"].get.return_value = drop(0, status="accepted")
    deps["players"].get_for_user.side_effect = None
    deps["players"].get_for_user.return_value = player()

    with pytest.raises(AppException) as refused:
        await deps["service"].revert(
            "id", SubmissionReject(reason=RejectionReason.DUPLICATE), ADMIN
        )
    assert refused.value.status_code == 403
