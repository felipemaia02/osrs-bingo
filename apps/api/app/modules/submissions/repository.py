from datetime import UTC, datetime
from typing import Any, cast

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.modules.submissions.models import SubmissionDocument
from app.modules.submissions.schemas import SubmissionKind, SubmissionStatus

OWN_SUBMISSIONS_LIMIT = 500


def preverification_gate(event_id: ObjectId, player_id: ObjectId, position: int) -> str:
    return f"{event_id}:{player_id}:{position}"


class SubmissionRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database["submissions"]

    async def insert(self, document: SubmissionDocument) -> bool:
        """False when a pending or accepted pre-verification already exists."""
        try:
            await self._collection.insert_one(document)
        except DuplicateKeyError:
            return False
        return True

    async def get(self, submission_id: str) -> SubmissionDocument | None:
        object_id = self._object_id(submission_id)
        if object_id is None:
            return None
        return cast(SubmissionDocument | None, await self._collection.find_one({"_id": object_id}))

    async def list_for_user(
        self, event_id: ObjectId, user_id: ObjectId
    ) -> list[SubmissionDocument]:
        cursor = (
            self._collection.find({"event_id": event_id, "user_id": user_id})
            .sort("submitted_at", -1)
            .limit(OWN_SUBMISSIONS_LIMIT)
        )
        return cast(list[SubmissionDocument], await cursor.to_list(length=OWN_SUBMISSIONS_LIMIT))

    async def page(
        self,
        event_id: ObjectId,
        status: SubmissionStatus,
        kind: SubmissionKind | None,
        offset: int,
        limit: int,
        newest_first: bool = False,
        extra: dict[str, Any] | None = None,
    ) -> tuple[list[SubmissionDocument], int]:
        query: dict[str, Any] = {"event_id": event_id, "status": status, **(extra or {})}
        if kind is not None:
            query["kind"] = kind
        total = await self._collection.count_documents(query)
        order = -1 if newest_first else 1
        cursor = self._collection.find(query).sort("submitted_at", order).skip(offset).limit(limit)
        return cast(list[SubmissionDocument], await cursor.to_list(length=limit)), total

    async def open_drops(
        self,
        event_id: ObjectId,
        player_ids: set[ObjectId],
        positions: set[int],
        digests: set[str],
    ) -> list[SubmissionDocument]:
        """Pending/accepted drops of these players on these tiles, or with these screenshot
        files: the candidates for possible duplicates (feature 035)."""
        alternatives: list[dict[str, Any]] = []
        if player_ids and positions:
            alternatives.append(
                {"player_id": {"$in": list(player_ids)}, "position": {"$in": list(positions)}}
            )
        if digests:
            alternatives.append({"screenshot_sha256": {"$in": list(digests)}})
        if not alternatives:
            return []
        cursor = self._collection.find(
            {
                "event_id": event_id,
                "kind": SubmissionKind.DROP,
                "status": {"$in": [SubmissionStatus.PENDING, SubmissionStatus.ACCEPTED]},
                "$or": alternatives,
            }
        )
        return cast(list[SubmissionDocument], await cursor.to_list(length=None))

    async def tile_drops(
        self, event_id: ObjectId, team_id: ObjectId, position: int
    ) -> list[SubmissionDocument]:
        """A team's pending and accepted drops on one tile, newest first (feature 035)."""
        cursor = self._collection.find(
            {
                "event_id": event_id,
                "team_id": team_id,
                "position": position,
                "kind": SubmissionKind.DROP,
                "status": {"$in": [SubmissionStatus.PENDING, SubmissionStatus.ACCEPTED]},
            }
        ).sort("submitted_at", -1)
        return cast(list[SubmissionDocument], await cursor.to_list(length=None))

    async def revert(
        self,
        submission_id: ObjectId,
        reviewer_id: str,
        reviewer_name: str,
        reason: str,
        note: str | None,
    ) -> SubmissionDocument | None:
        """Turns an accepted submission into a rejected one, only if it's still accepted."""
        now = datetime.now(UTC)
        return cast(
            SubmissionDocument | None,
            await self._collection.find_one_and_update(
                {"_id": submission_id, "status": SubmissionStatus.ACCEPTED},
                {
                    "$set": {
                        "status": SubmissionStatus.REJECTED,
                        "reviewed_at": now,
                        "reviewed_by": reviewer_id,
                        "reviewer_name": reviewer_name,
                        "rejection_reason": reason,
                        "rejection_note": note,
                        "reverted_at": now,
                        "reverted_by": reviewer_id,
                    },
                    # A reverted pre-verification frees the slot for a new one.
                    "$unset": {"preverification_gate": ""},
                },
                return_document=ReturnDocument.AFTER,
            ),
        )

    async def pending_counts(self, event_id: ObjectId) -> dict[str, int]:
        pipeline: list[dict[str, Any]] = [
            {"$match": {"event_id": event_id, "status": SubmissionStatus.PENDING}},
            {"$group": {"_id": "$kind", "count": {"$sum": 1}}},
        ]
        return {row["_id"]: row["count"] async for row in self._collection.aggregate(pipeline)}

    async def preverification_statuses(
        self, event_id: ObjectId, keys: set[tuple[ObjectId, int]]
    ) -> dict[tuple[ObjectId, int], str]:
        """Best state per (player, position): accepted > pending > rejected."""
        if not keys:
            return {}
        rank = {
            SubmissionStatus.ACCEPTED: 3,
            SubmissionStatus.PENDING: 2,
            SubmissionStatus.REJECTED: 1,
        }
        cursor = self._collection.find(
            {
                "event_id": event_id,
                "kind": SubmissionKind.PREVERIFICATION,
                "$or": [{"player_id": player, "position": position} for player, position in keys],
            },
            {"player_id": 1, "position": 1, "status": 1},
        )
        best: dict[tuple[ObjectId, int], str] = {}
        async for row in cursor:
            key = (row["player_id"], row["position"])
            current = best.get(key)
            if (
                current is None
                or rank[SubmissionStatus(row["status"])] > rank[SubmissionStatus(current)]
            ):
                best[key] = row["status"]
        return best

    async def review(
        self,
        submission_id: ObjectId,
        decision: SubmissionStatus,
        reviewer_id: str,
        reviewer_name: str,
        reason: str | None = None,
        note: str | None = None,
    ) -> SubmissionDocument | None:
        """Applies a decision only if the submission is still pending."""
        update: dict[str, Any] = {
            "$set": {
                "status": decision,
                "reviewed_at": datetime.now(UTC),
                "reviewed_by": reviewer_id,
                "reviewer_name": reviewer_name,
                "rejection_reason": reason,
                "rejection_note": note,
            }
        }
        if decision == SubmissionStatus.REJECTED:
            update["$unset"] = {"preverification_gate": ""}
        return cast(
            SubmissionDocument | None,
            await self._collection.find_one_and_update(
                {"_id": submission_id, "status": SubmissionStatus.PENDING},
                update,
                return_document=ReturnDocument.AFTER,
            ),
        )

    async def accepted_drops(self, event_id: ObjectId) -> list[SubmissionDocument]:
        """The verified activity scoring consumes (feature 006)."""
        cursor = self._collection.find(
            {
                "event_id": event_id,
                "kind": SubmissionKind.DROP,
                "status": SubmissionStatus.ACCEPTED,
            },
            {
                "team_id": 1,
                "player_id": 1,
                "position": 1,
                "drop_key": 1,
                "drop_name": 1,
                "progress_weight": 1,
                "quantity": 1,
            },
        )
        return cast(list[SubmissionDocument], await cursor.to_list(length=None))

    @staticmethod
    def _object_id(value: str) -> ObjectId | None:
        try:
            return ObjectId(value)
        except (InvalidId, TypeError):
            return None
