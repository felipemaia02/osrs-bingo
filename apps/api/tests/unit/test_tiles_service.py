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


def test_preverification_needs_instructions_in_the_note() -> None:
    with pytest.raises(ValidationError, match="Describe the pre-verification"):
        card_payload(requires_preverification=True, rule_note=None)
    card = card_payload(requires_preverification=True, rule_note="Screenshot your ToB KC")
    assert card.rule_note == "Screenshot your ToB KC"


def test_stored_revisions_without_instructions_still_load() -> None:
    from app.modules.tiles.schemas import CardRevisionResponse

    stored = {
        **card_payload().model_dump(exclude={"slug", "change_reason"}),
        "requires_preverification": True,
        "rule_note": None,
        "revision": 2,
        "change_reason": "Flag added before feature 019",
        "provenance": {
            "source": "admin",
            "source_ref": None,
            "source_cells": [],
            "derived_from_revision": None,
        },
        "created_by": "admin",
        "created_at": "2026-10-23T12:00:00Z",
    }
    assert CardRevisionResponse.model_validate(stored).requires_preverification is True


async def test_linking_items_adds_ids_by_exact_name_in_a_new_revision() -> None:
    document = card_document()
    document["revisions"][0]["drops"].append(
        {"key": "custom-task", "name": "Custom task", "progress_weight": 1}
    )
    repository = AsyncMock(spec=CardRepository)
    repository.list_cards.return_value = [document]
    repository.add_revision.return_value = document
    items = AsyncMock()
    items.ids_by_name.return_value = {"skeletal visage": [22006]}

    result = await CardService(repository).link_items(ADMIN, items)

    assert (result.linked_cards, result.linked_drops, result.unlinked_drops) == (1, 1, 1)
    card_id, payload, actor = repository.add_revision.await_args.args
    assert card_id == str(document["_id"]) and actor == ADMIN.id
    assert payload.expected_revision == 1 and payload.change_reason == "Linked drops to OSRS items"
    visage, custom = payload.drops
    assert visage.item_ids == [22006] and visage.match_by_name
    assert custom.item_ids == []


async def test_linking_items_skips_cards_with_nothing_to_link_or_that_changed() -> None:
    linked = card_document()
    linked["revisions"][0]["drops"][0]["item_ids"] = [22006]
    linked["revisions"][0]["categories"] = ["solo_bosses"]
    stale = card_document()
    stale["_id"] = ObjectId("66d000000000000000000011")
    repository = AsyncMock(spec=CardRepository)
    repository.list_cards.return_value = [linked, stale]
    repository.add_revision.return_value = None
    items = AsyncMock()
    items.ids_by_name.return_value = {"skeletal visage": [22006]}

    result = await CardService(repository).link_items(ADMIN, items)

    assert result.linked_cards == 0 and result.skipped_cards == ["Vorkath"]
    assert repository.add_revision.await_count == 1


async def test_linking_items_applies_the_bundled_workbook_fixes_to_imported_cards() -> None:
    document = card_document()
    document["slug"] = "alchemical-hydra"
    document["revisions"][0]["name"] = "Alchemical Hydra"
    document["revisions"][0]["drops"] = [
        {"key": "hydra-s-tail", "name": "Hydra's Tail", "progress_weight": 2},
        {"key": "brimstone-ring-piece", "name": "Brimstone Ring Piece", "progress_weight": 1},
    ]
    repository = AsyncMock(spec=CardRepository)
    repository.list_cards.return_value = [document]
    repository.add_revision.return_value = document
    items = AsyncMock()
    items.ids_by_name.return_value = {}

    result = await CardService(repository).link_items(ADMIN, items)

    assert (result.linked_drops, result.unlinked_drops) == (2, 0)
    tail, brimstone = repository.add_revision.await_args.args[1].drops
    assert (tail.name, tail.item_ids, tail.match_by_name) == ("Hydra tail", [22988], True)
    assert brimstone.name == "Brimstone Ring Piece" and not brimstone.match_by_name
    assert brimstone.item_ids == [22969, 22971, 22973] and tail.progress_weight == 2


async def test_workbook_cards_without_categories_get_the_bundled_ones() -> None:
    """040: Vorkath is a workbook card; its bundled category is applied once."""
    document = card_document()
    document["revisions"][0]["drops"][0]["item_ids"] = [22006]
    repository = AsyncMock(spec=CardRepository)
    repository.list_cards.return_value = [document]
    repository.add_revision.return_value = document
    items = AsyncMock()
    items.ids_by_name.return_value = {}

    result = await CardService(repository).link_items(ADMIN, items)

    assert (result.categorized_cards, result.linked_cards) == (1, 0)
    payload = repository.add_revision.await_args.args[1]
    assert payload.categories == ["solo_bosses"]


def test_card_categories_are_unique_and_known() -> None:
    payload = card_payload(categories=["raids", "raids", "solo_bosses"])
    assert payload.categories == ["raids", "solo_bosses"]
    with pytest.raises(ValidationError):
        card_payload(categories=["pvm"])
