"""Likely duplicate submissions (feature 035): flagged for reviewers, never skipped."""

from collections.abc import Iterable, Mapping
from datetime import UTC, datetime, timedelta
from typing import Any

from bson import ObjectId

from app.modules.submissions.schemas import SubmissionKind

# Same player, item and tile sent this close together probably show the same drop.
DUPLICATE_WINDOW = timedelta(hours=1)


def _utc(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


def _same_drop(one: Mapping[str, Any], other: Mapping[str, Any]) -> bool:
    return (
        one["player_id"] == other["player_id"]
        and one["position"] == other["position"]
        and one["drop_key"] == other["drop_key"]
        and abs(_utc(one["submitted_at"]) - _utc(other["submitted_at"])) <= DUPLICATE_WINDOW
    )


def _same_file(one: Mapping[str, Any], other: Mapping[str, Any]) -> bool:
    digest = one.get("screenshot_sha256")
    return bool(digest) and digest == other.get("screenshot_sha256")


def possible_duplicates(
    documents: Iterable[Mapping[str, Any]], candidates: Iterable[Mapping[str, Any]]
) -> dict[ObjectId, list[str]]:
    """For each drop submission, the IDs of pending/accepted candidates that look like it:
    same player, item and tile within an hour, or exactly the same screenshot file."""
    pool = list(candidates)
    found: dict[ObjectId, list[str]] = {}
    for document in documents:
        if document["kind"] != SubmissionKind.DROP:
            continue
        matches = [
            str(other["_id"])
            for other in pool
            if other["_id"] != document["_id"]
            and (_same_drop(document, other) or _same_file(document, other))
        ]
        if matches:
            found[document["_id"]] = sorted(set(matches))
    return found
