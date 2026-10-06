from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.modules.tiles.models import CardDocument
from app.modules.tiles.schemas import (
    CardCreate,
    CardRetire,
    CardRevisionCreate,
    CardStatus,
    WikiImage,
)

CARDS_COLLECTION = "tile_cards"


class CardRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._collection = database[CARDS_COLLECTION]
        self._imports = database["catalog_imports"]

    async def create(self, payload: CardCreate, actor_id: str) -> CardDocument | None:
        now = datetime.now(UTC)
        revision = self._revision_document(payload, actor_id, 1, now, derived_from=None)
        document: CardDocument = {
            "_id": ObjectId(),
            "slug": payload.slug,
            "status": CardStatus.ACTIVE,
            "current_revision": 1,
            "revisions": [revision],
            "created_at": now,
            "updated_at": now,
        }
        try:
            await self._collection.insert_one(document)
        except DuplicateKeyError:
            return None
        return document

    async def list_cards(self, include_retired: bool) -> list[CardDocument]:
        query: dict[str, object] = {} if include_retired else {"status": CardStatus.ACTIVE}
        cursor = self._collection.find(query).sort([("revisions.0.name", 1), ("_id", 1)])
        return [cast(CardDocument, document) async for document in cursor]

    async def get(self, card_id: str) -> CardDocument | None:
        object_id = self._object_id(card_id)
        if object_id is None:
            return None
        return cast(CardDocument | None, await self._collection.find_one({"_id": object_id}))

    async def add_revision(
        self, card_id: str, payload: CardRevisionCreate, actor_id: str
    ) -> CardDocument | None:
        object_id = self._object_id(card_id)
        if object_id is None:
            return None
        now = datetime.now(UTC)
        next_revision = payload.expected_revision + 1
        revision = self._revision_document(
            payload,
            actor_id,
            next_revision,
            now,
            derived_from=payload.expected_revision,
        )
        document = await self._collection.find_one_and_update(
            {
                "_id": object_id,
                "status": CardStatus.ACTIVE,
                "current_revision": payload.expected_revision,
            },
            {
                "$set": {"current_revision": next_revision, "updated_at": now},
                "$push": {"revisions": revision},
            },
            return_document=ReturnDocument.AFTER,
        )
        return cast(CardDocument | None, document)

    async def retire(
        self, card_id: str, payload: CardRetire, actor_id: str
    ) -> CardDocument | None:
        object_id = self._object_id(card_id)
        if object_id is None:
            return None
        now = datetime.now(UTC)
        document = await self._collection.find_one_and_update(
            {
                "_id": object_id,
                "status": CardStatus.ACTIVE,
                "current_revision": payload.expected_revision,
            },
            {
                "$set": {
                    "status": CardStatus.RETIRED,
                    "retired_by": actor_id,
                    "retired_at": now,
                    "retirement_reason": payload.reason,
                    "updated_at": now,
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        return cast(CardDocument | None, document)

    async def import_workbook(
        self, catalog: dict[str, Any], actor_id: str
    ) -> tuple[int, int, list[str]]:
        now = datetime.now(UTC)
        source = catalog["source"]
        imported = 0
        existing = 0
        conflicts: list[str] = []
        for card in catalog["cards"]:
            drops = [
                {key: value for key, value in drop.items() if key != "source_cell"}
                for drop in card["drops"]
            ]
            revision = {
                "name": card["name"],
                "description": card["description"],
                "kind": card["kind"],
                "difficulty": card["difficulty"],
                "tile_score": card["tile_score"],
                "completion_requirement": card["completion_requirement"],
                "drops": drops,
                "wiki_image": (
                    WikiImage.model_validate(card["wiki_image"]).model_dump(mode="python")
                    if card.get("wiki_image")
                    else None
                ),
                "fallback_image_accepted": card["fallback_image_accepted"],
                "rule_note": card["rule_note"],
                "revision": 1,
                "provenance": {
                    "source": "workbook",
                    "source_ref": source["sha256"],
                    "source_cells": card["source_cells"],
                    "derived_from_revision": None,
                },
                "change_reason": "Approved workbook catalog import",
                "created_by": actor_id,
                "created_at": now,
            }
            document: CardDocument = {
                "_id": ObjectId(),
                "slug": card["slug"],
                "status": CardStatus.ACTIVE,
                "current_revision": 1,
                "revisions": [revision],
                "created_at": now,
                "updated_at": now,
            }
            try:
                await self._collection.insert_one(document)
                imported += 1
            except DuplicateKeyError:
                current = await self._collection.find_one({"slug": card["slug"]})
                provenance = ((current or {}).get("revisions") or [{}])[0].get("provenance", {})
                if provenance.get("source_ref") == source["sha256"]:
                    existing += 1
                else:
                    conflicts.append(card["slug"])
        if not conflicts:
            await self._imports.update_one(
                {"_id": source["sha256"]},
                {
                    "$setOnInsert": {
                        "source": source,
                        "bonus_entries": catalog["bonus_entries"],
                        "imported_by": actor_id,
                        "imported_at": now,
                    }
                },
                upsert=True,
            )
        return imported, existing, conflicts

    @staticmethod
    def _revision_document(
        payload: CardCreate | CardRevisionCreate,
        actor_id: str,
        revision: int,
        now: datetime,
        derived_from: int | None,
    ) -> dict[str, Any]:
        fields = payload.model_dump(
            exclude={"slug", "expected_revision", "change_reason"}, mode="python"
        )
        return {
            **fields,
            "revision": revision,
            "provenance": {
                "source": "admin",
                "source_ref": None,
                "source_cells": [],
                "derived_from_revision": derived_from,
            },
            "change_reason": payload.change_reason,
            "created_by": actor_id,
            "created_at": now,
        }

    @staticmethod
    def _object_id(value: str) -> ObjectId | None:
        try:
            return ObjectId(value)
        except (InvalidId, TypeError):
            return None
