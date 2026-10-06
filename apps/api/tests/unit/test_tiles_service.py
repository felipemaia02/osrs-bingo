from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from pydantic import ValidationError

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.auth.schemas import CurrentUser
from app.modules.tiles.models import CardDocument
from app.modules.tiles.repository import CardRepository
from app.modules.tiles.schemas import CardCreate, CardRevisionCreate, CardStatus
from app.modules.tiles.service import CardService

NOW = datetime(2026, 10, 3, 18, tzinfo=UTC)
ADMIN = CurrentUser(id="admin-id", discord_id="123", username="Admin", is_admin=True)


def card_payload(**changes: object) -> CardCreate:
    values: dict[str, object] = {
        "slug": "vorkath",
        "name": "Vorkath",
        "kind": "boss",
        "difficulty": "High",
        "tile_score": 13,
        "completion_requirement": 8,
        "drops": [{"key": "skeletal-visage", "name": "Skeletal Visage", "progress_weight": 2}],
        "fallback_image_accepted": True,
        "change_reason": "Initial card",
    }
    values.update(changes)
    return CardCreate.model_validate(values)


def card_document() -> CardDocument:
    payload = card_payload()
    revision = {
        **payload.model_dump(exclude={"slug", "change_reason"}),
        "revision": 1,
        "provenance": {
            "source": "admin",
            "source_ref": None,
            "source_cells": [],
            "derived_from_revision": None,
        },
        "change_reason": payload.change_reason,
        "created_by": ADMIN.id,
        "created_at": NOW,
    }
    return {
        "_id": ObjectId("66d000000000000000000010"),
        "slug": "vorkath",
        "status": CardStatus.ACTIVE,
        "current_revision": 1,
        "revisions": [revision],
        "created_at": NOW,
        "updated_at": NOW,
    }


def test_card_score_is_independent_from_difficulty() -> None:
    payload = card_payload(difficulty="High", tile_score=13)

    assert payload.difficulty.value == "High"
    assert payload.tile_score == 13


def test_card_requires_wiki_image_or_explicit_fallback() -> None:
    with pytest.raises(ValidationError, match="explicitly accept the fallback"):
        card_payload(fallback_image_accepted=False)


async def test_create_returns_first_immutable_revision() -> None:
    repository = AsyncMock(spec=CardRepository)
    repository.create.return_value = card_document()
    service = CardService(repository)

    created = await service.create(card_payload(), ADMIN)

    assert created.current_revision == 1
    assert created.revision.tile_score == 13
    repository.create.assert_awaited_once()


async def test_duplicate_slug_is_a_conflict() -> None:
    repository = AsyncMock(spec=CardRepository)
    repository.create.return_value = None

    with pytest.raises(ConflictError, match="slug"):
        await CardService(repository).create(card_payload(), ADMIN)


async def test_stale_revision_is_a_conflict() -> None:
    repository = AsyncMock(spec=CardRepository)
    repository.get.return_value = card_document()
    repository.add_revision.return_value = None
    payload = CardRevisionCreate.model_validate(
        {
            **card_payload().model_dump(exclude={"slug", "change_reason"}),
            "expected_revision": 1,
            "change_reason": "Adjust points",
        }
    )

    with pytest.raises(ConflictError, match="changed"):
        await CardService(repository).add_revision("66d000000000000000000010", payload, ADMIN)


async def test_missing_card_cannot_receive_revision() -> None:
    repository = AsyncMock(spec=CardRepository)
    repository.get.return_value = None
    payload = CardRevisionCreate.model_validate(
        {
            **card_payload().model_dump(exclude={"slug", "change_reason"}),
            "expected_revision": 1,
            "change_reason": "Adjust points",
        }
    )

    with pytest.raises(NotFoundError):
        await CardService(repository).add_revision("missing", payload, ADMIN)

