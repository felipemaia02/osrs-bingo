from __future__ import annotations

import re
from builtins import list as builtin_list
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from typing import Any, cast

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.modules.players.models import (
    NewRegistration,
    PlayerDocument,
    RosterDocument,
    TeamExperience,
)
from app.modules.players.schemas import (
    BuyInStatus,
    ParticipantRole,
    PlayerUpdate,
    RegistrationStatus,
)

PLAYERS_COLLECTION = "players"
USERS_COLLECTION = "users"
PROFILES_COLLECTION = "player_profiles"


class CaptainTakenError(Exception):
    """The team already has a captain (unique partial index, feature 023)."""


def _experience_stages() -> builtin_list[dict[str, Any]]:
    """Adds the player's current profile totals (feature 021 rule) to registrations made
    with an account (feature 022); nickname registrations get None."""
    accounts = {"$ifNull": [{"$first": "$profile.accounts"}, []]}
    counted = {
        "$filter": {
            "input": accounts,
            "as": "account",
            "cond": {
                "$and": [
                    {"$ne": ["$$account.wom_status", "not_found"]},
                    {"$ne": [{"$ifNull": ["$$account.boss_kc", None]}, None]},
                ]
            },
        }
    }
    joined = {"$ne": [{"$ifNull": ["$account_id", None]}, None]}
    return [
        {
            "$lookup": {
                "from": PROFILES_COLLECTION,
                "localField": "user_id",
                "foreignField": "_id",
                "as": "profile",
            }
        },
        {"$addFields": {"counted_accounts": counted}},
        {
            "$addFields": {
                "boss_kc_total": {"$cond": [joined, {"$sum": "$counted_accounts.boss_kc"}, None]},
                "ehb_total": {
                    "$cond": [joined, {"$round": [{"$sum": "$counted_accounts.ehb"}, 2]}, None]
                },
                "account_count": {"$cond": [joined, {"$size": accounts}, None]},
                "profile_accounts": {"$cond": [joined, accounts, []]},
                "timezone": {"$first": "$profile.timezone"},
            }
        },
        {"$project": {"profile": 0, "counted_accounts": 0}},
    ]


def _clear_captain(team: Any) -> dict[str, Any]:
    """Pipeline value: keeps the role unless it's captain and the team changes (BR-003)."""
    moved = {"$and": [{"$eq": ["$role", ParticipantRole.CAPTAIN]}, {"$ne": ["$team_id", team]}]}
    return {"$cond": [moved, None, {"$ifNull": ["$role", None]}]}


class PlayerRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database[PLAYERS_COLLECTION]

    async def create(
        self, event_id: str, registration: NewRegistration, user_id: str
    ) -> PlayerDocument | None:
        event_object_id = self._object_id(event_id)
        user_object_id = self._object_id(user_id)
        if event_object_id is None or user_object_id is None:
            return None
        now = datetime.now(UTC)
        document: PlayerDocument = {
            "_id": ObjectId(),
            "event_id": event_object_id,
            "team_id": None,
            "user_id": user_object_id,
            "status": RegistrationStatus.PENDING,
            "display_name": registration.display_name,
            "normalized_display_name": self._normalize(registration.display_name),
            "account_id": registration.account_id,
            "activity": registration.activity,
            "teammate_ids": [ObjectId(item) for item in registration.teammate_ids],
            "agreements_accepted_at": now,
            "buy_in": {"status": BuyInStatus.PENDING, "admin_id": None, "updated_at": now},
            "created_at": now,
            "updated_at": now,
        }
        try:
            await self._collection.insert_one(document)
        except DuplicateKeyError:
            return None
        return document

    async def get(self, event_id: str, player_id: str) -> PlayerDocument | None:
        event_object_id = self._object_id(event_id)
        player_object_id = self._object_id(player_id)
        if event_object_id is None or player_object_id is None:
            return None
        return cast(
            PlayerDocument | None,
            await self._collection.find_one({"_id": player_object_id, "event_id": event_object_id}),
        )

    async def page(
        self,
        event_id: str,
        *,
        status: RegistrationStatus | None,
        assigned: bool | None,
        search: str,
        team_id: str | None,
        offset: int,
        limit: int,
    ) -> tuple[builtin_list[RosterDocument], int]:
        """A page of registrations with their Discord username and profile experience, highest
        EHB first; search matches either name."""
        match: dict[str, Any] = {
            "event_id": self._object_id(event_id),
            "status": status
            if status
            else {"$in": [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]},
        }
        if assigned is not None:
            match["team_id"] = {"$ne": None} if assigned else None
        if team_id:
            match["team_id"] = self._object_id(team_id)
        pipeline: builtin_list[dict[str, Any]] = [
            {"$match": match},
            {
                "$lookup": {
                    "from": USERS_COLLECTION,
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "discord_user",
                }
            },
            {"$addFields": {"discord_username": {"$first": "$discord_user.username"}}},
            {"$project": {"discord_user": 0}},
        ]
        if search.strip():
            pipeline.append(
                {
                    "$match": {
                        "$or": [
                            {
                                "normalized_display_name": {
                                    "$regex": re.escape(self._normalize(search))
                                }
                            },
                            {
                                "discord_username": {
                                    "$regex": re.escape(search.strip()),
                                    "$options": "i",
                                }
                            },
                        ]
                    }
                }
            )
        pipeline.extend(_experience_stages())
        pipeline.append(
            {
                "$facet": {
                    "items": [
                        {"$sort": {"ehb_total": -1, "normalized_display_name": 1, "_id": 1}},
                        {"$skip": offset},
                        {"$limit": limit},
                        *self._row_lookups(),
                    ],
                    "total": [{"$count": "value"}],
                }
            }
        )
        results = await self._collection.aggregate(pipeline).to_list(length=1)
        page = results[0] if results else {"items": [], "total": []}
        total = page["total"][0]["value"] if page["total"] else 0
        return cast(builtin_list[RosterDocument], page["items"]), int(total)

    @staticmethod
    def _row_lookups() -> builtin_list[dict[str, Any]]:
        """Names for wanted teammates (users + profiles) and the buy-in's receiving admin."""
        return [
            {
                "$lookup": {
                    "from": USERS_COLLECTION,
                    "localField": "teammate_ids",
                    "foreignField": "_id",
                    "as": "mate_users",
                    "pipeline": [{"$project": {"username": 1}}],
                }
            },
            {
                "$lookup": {
                    "from": PROFILES_COLLECTION,
                    "localField": "teammate_ids",
                    "foreignField": "_id",
                    "as": "mate_profiles",
                    "pipeline": [{"$project": {"accounts.rsn": 1, "accounts.is_main": 1}}],
                }
            },
            {
                "$lookup": {
                    "from": USERS_COLLECTION,
                    "localField": "buy_in.admin_id",
                    "foreignField": "_id",
                    "as": "buy_in_admin",
                    "pipeline": [{"$project": {"username": 1}}],
                }
            },
        ]

    async def event_ids_for_user(self, user_id: str) -> builtin_list[ObjectId]:
        """Events where the user has a pending or approved registration (feature 026)."""
        user_object_id = self._object_id(user_id)
        if user_object_id is None:
            return []
        ids = await self._collection.distinct(
            "event_id",
            {
                "user_id": user_object_id,
                "status": {"$in": [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]},
            },
        )
        return builtin_list(ids)

    async def captains(self, event_id: str) -> builtin_list[RosterDocument]:
        """Approved captains with their profile experience (feature 024)."""
        pipeline: builtin_list[dict[str, Any]] = [
            {
                "$match": {
                    "event_id": self._object_id(event_id),
                    "status": RegistrationStatus.APPROVED,
                    "role": ParticipantRole.CAPTAIN,
                }
            },
            *_experience_stages(),
        ]
        return cast(
            builtin_list[RosterDocument],
            await self._collection.aggregate(pipeline).to_list(length=None),
        )

    async def team_experience(self, event_id: str) -> builtin_list[TeamExperience]:
        """Per team: approved players, their profile totals and the captain (feature 023)."""
        pipeline: builtin_list[dict[str, Any]] = [
            {
                "$match": {
                    "event_id": self._object_id(event_id),
                    "status": RegistrationStatus.APPROVED,
                    "team_id": {"$ne": None},
                }
            },
            *_experience_stages(),
            {
                "$group": {
                    "_id": "$team_id",
                    "player_count": {"$sum": 1},
                    "boss_kc_total": {"$sum": {"$ifNull": ["$boss_kc_total", 0]}},
                    "ehb_total": {"$sum": {"$ifNull": ["$ehb_total", 0]}},
                    "captains": {
                        "$push": {
                            "$cond": [
                                {"$eq": ["$role", ParticipantRole.CAPTAIN]},
                                "$display_name",
                                "$$REMOVE",
                            ]
                        }
                    },
                }
            },
        ]
        return cast(
            builtin_list[TeamExperience],
            await self._collection.aggregate(pipeline).to_list(length=None),
        )

    async def set_participation(
        self,
        event_id: str,
        player_id: str,
        *,
        role: ParticipantRole | None,
        team_id: ObjectId | None,
        buy_in: dict[str, Any] | None,
    ) -> PlayerDocument | None:
        """Sets role (and buy-in when given) while the registration is still approved and on
        the same team; None when it changed meanwhile."""
        changes: dict[str, Any] = {"role": role, "updated_at": datetime.now(UTC)}
        if buy_in is not None:
            changes["buy_in"] = buy_in
        query: dict[str, Any] = {
            "_id": self._object_id(player_id),
            "event_id": self._object_id(event_id),
            "status": {"$in": [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]},
        }
        if role is not None:
            query["status"] = RegistrationStatus.APPROVED
            query["team_id"] = team_id
        try:
            document = await self._collection.find_one_and_update(
                query, {"$set": changes}, return_document=ReturnDocument.AFTER
            )
        except DuplicateKeyError as exc:
            raise CaptainTakenError from exc
        return cast(PlayerDocument | None, document)

    async def approve_selected(self, event_id: str, player_ids: builtin_list[str]) -> int:
        """Approves listed registrations that are still pending; returns how many changed."""
        return await self._update_selected(
            event_id,
            player_ids,
            {"status": RegistrationStatus.PENDING},
            {"status": RegistrationStatus.APPROVED},
        )

    async def remove_selected(self, event_id: str, player_ids: builtin_list[str]) -> int:
        """Soft-removes listed pending/approved registrations, clearing their team."""
        return await self._update_selected(
            event_id,
            player_ids,
            {"status": {"$in": [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]}},
            {"status": RegistrationStatus.REMOVED, "team_id": None},
        )

    async def _update_selected(
        self,
        event_id: str,
        player_ids: builtin_list[str],
        state: dict[str, Any],
        changes: dict[str, Any],
    ) -> int:
        object_ids = [oid for oid in map(self._object_id, player_ids) if oid is not None]
        event_object_id = self._object_id(event_id)
        if event_object_id is None or not object_ids:
            return 0
        if "team_id" in changes:
            changes = {"role": _clear_captain(changes["team_id"]), **changes}
        result = await self._collection.update_many(
            {"_id": {"$in": object_ids}, "event_id": event_object_id, **state},
            [{"$set": {**changes, "updated_at": datetime.now(UTC)}}],
        )
        return int(result.modified_count)

    async def counts(self, event_id: str) -> dict[str, int]:
        base = {"event_id": self._object_id(event_id)}
        pending = await self._collection.count_documents(
            {**base, "status": RegistrationStatus.PENDING}
        )
        unassigned = await self._collection.count_documents(
            {**base, "status": RegistrationStatus.APPROVED, "team_id": None}
        )
        assigned = await self._collection.count_documents(
            {**base, "status": RegistrationStatus.APPROVED, "team_id": {"$ne": None}}
        )
        return {"pending": int(pending), "unassigned": int(unassigned), "assigned": int(assigned)}

    async def update(
        self, event_id: str, player_id: str, payload: PlayerUpdate
    ) -> PlayerDocument | None:
        event_object_id = self._object_id(event_id)
        player_object_id = self._object_id(player_id)
        team_object_id = self._object_id(payload.team_id) if payload.team_id else None
        if event_object_id is None or player_object_id is None:
            return None
        document = await self._collection.find_one_and_update(
            {
                "_id": player_object_id,
                "event_id": event_object_id,
                "status": RegistrationStatus.APPROVED,
            },
            [
                {
                    "$set": {
                        "role": _clear_captain(team_object_id),
                        "team_id": team_object_id,
                        "updated_at": datetime.now(UTC),
                    }
                }
            ],
            return_document=ReturnDocument.AFTER,
        )
        return cast(PlayerDocument | None, document)

    async def get_many(self, player_ids: builtin_list[ObjectId]) -> dict[ObjectId, PlayerDocument]:
        if not player_ids:
            return {}
        cursor = self._collection.find({"_id": {"$in": player_ids}})
        return {document["_id"]: cast(PlayerDocument, document) async for document in cursor}

    async def list_assigned(self, event_id: str) -> builtin_list[PlayerDocument]:
        """Approved players that have a team, sorted by name."""
        object_id = self._object_id(event_id)
        if object_id is None:
            return []
        cursor = self._collection.find(
            {"event_id": object_id, "status": "approved", "team_id": {"$ne": None}}
        ).sort("normalized_display_name", 1)
        return cast(builtin_list[PlayerDocument], await cursor.to_list(length=None))

    async def get_for_user(self, event_id: str, user_id: str) -> PlayerDocument | None:
        event_object_id, user_object_id = self._object_id(event_id), self._object_id(user_id)
        if event_object_id is None or user_object_id is None:
            return None
        return cast(
            PlayerDocument | None,
            await self._collection.find_one(
                {"event_id": event_object_id, "user_id": user_object_id}
            ),
        )

    async def approve(self, event_id: str, player_id: str) -> PlayerDocument | None:
        event_object_id, player_object_id = self._object_id(event_id), self._object_id(player_id)
        if event_object_id is None or player_object_id is None:
            return None
        return cast(
            PlayerDocument | None,
            await self._collection.find_one_and_update(
                {
                    "_id": player_object_id,
                    "event_id": event_object_id,
                    "status": RegistrationStatus.PENDING,
                },
                {"$set": {"status": RegistrationStatus.APPROVED, "updated_at": datetime.now(UTC)}},
                return_document=ReturnDocument.AFTER,
            ),
        )

    async def approve_all(self, event_id: str) -> int:
        event_object_id = self._object_id(event_id)
        if event_object_id is None:
            return 0
        result = await self._collection.update_many(
            {"event_id": event_object_id, "status": RegistrationStatus.PENDING},
            {"$set": {"status": RegistrationStatus.APPROVED, "updated_at": datetime.now(UTC)}},
        )
        return int(result.modified_count)

    async def remove(self, event_id: str, player_id: str) -> PlayerDocument | None:
        event_object_id, player_object_id = self._object_id(event_id), self._object_id(player_id)
        if event_object_id is None or player_object_id is None:
            return None
        return cast(
            PlayerDocument | None,
            await self._collection.find_one_and_update(
                {
                    "_id": player_object_id,
                    "event_id": event_object_id,
                    "status": {"$in": [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]},
                },
                [
                    {
                        "$set": {
                            "role": _clear_captain(None),
                            "status": RegistrationStatus.REMOVED,
                            "team_id": None,
                            "updated_at": datetime.now(UTC),
                        }
                    }
                ],
                return_document=ReturnDocument.AFTER,
            ),
        )

    async def count_by_team_ids(self, team_ids: builtin_list[ObjectId]) -> dict[ObjectId, int]:
        if not team_ids:
            return {}
        pipeline: Sequence[Mapping[str, Any]] = [
            {"$match": {"team_id": {"$in": team_ids}, "status": RegistrationStatus.APPROVED}},
            {"$group": {"_id": "$team_id", "count": {"$sum": 1}}},
        ]
        return {item["_id"]: item["count"] async for item in self._collection.aggregate(pipeline)}

    @staticmethod
    def _normalize(value: str) -> str:
        return " ".join(value.split()).casefold()

    @staticmethod
    def _object_id(value: str | None) -> ObjectId | None:
        if value is None:
            return None
        try:
            return ObjectId(value)
        except (InvalidId, TypeError):
            return None
