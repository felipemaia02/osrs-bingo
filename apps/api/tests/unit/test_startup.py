from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from pymongo.errors import DuplicateKeyError

from app.database.board_card_links import relink_orphaned_board_cards
from app.database.indexes import IndexManager
from app.main import lifespan


async def test_legacy_active_events_fail_with_actionable_error_without_data_changes() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.create_index = AsyncMock(side_effect=DuplicateKeyError("duplicate active status"))

    with pytest.raises(RuntimeError, match="Explicitly finish the surplus events"):
        await IndexManager().ensure_all(database)

    collection.update_many.assert_not_called()
    collection.update_one.assert_not_called()
    collection.drop_index.assert_not_called()


async def test_unrelated_duplicate_index_error_is_preserved() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    duplicate = DuplicateKeyError("duplicate team name")
    collection.create_index = AsyncMock(side_effect=[None, None, duplicate])

    with pytest.raises(DuplicateKeyError) as caught:
        await IndexManager().ensure_all(database)

    assert caught.value is duplicate
    collection.update_many.assert_not_called()


async def test_failed_index_setup_closes_database_and_does_not_start_application() -> None:
    database_client = MagicMock()
    database_client.connect = AsyncMock()
    database_client.disconnect = AsyncMock()
    index_setup = AsyncMock(side_effect=RuntimeError("Multiple legacy events are active"))

    with (
        patch("app.main.DatabaseClient", return_value=database_client),
        patch("app.main.IndexManager.ensure_all", index_setup),
        patch("app.main.AdministrationRepository.initialize", new_callable=AsyncMock) as initialize,
        pytest.raises(RuntimeError, match="Multiple legacy events"),
    ):
        async with lifespan(FastAPI()):
            pytest.fail("Startup must not complete without its unique index")

    database_client.disconnect.assert_awaited_once()
    initialize.assert_not_awaited()


async def test_startup_clears_removed_roles_and_card_types() -> None:
    collections: dict[str, MagicMock] = {}

    def collection(name: str) -> MagicMock:
        if name not in collections:
            collections[name] = MagicMock(create_index=AsyncMock(), update_many=AsyncMock())
        return collections[name]

    database = MagicMock()
    database.__getitem__.side_effect = collection

    with patch("app.database.indexes.relink_orphaned_board_cards", AsyncMock()):
        await IndexManager().ensure_all(database)

    collections["players"].update_many.assert_any_await(
        {"role": "instructor"}, {"$set": {"role": None}}
    )
    collections["tile_cards"].update_many.assert_awaited_once_with(
        {"revisions.kind": {"$exists": True}}, {"$unset": {"revisions.$[].kind": ""}}
    )
    collections["event_boards"].update_many.assert_awaited_once_with(
        {"positions.card.kind": {"$exists": True}}, {"$unset": {"positions.$[].card.kind": ""}}
    )


class _Cursor:
    def __init__(self, documents: list[dict[str, object]]) -> None:
        self._documents = iter(documents)

    def __aiter__(self) -> "_Cursor":
        return self

    async def __anext__(self) -> dict[str, object]:
        try:
            return next(self._documents)
        except StopIteration:
            raise StopAsyncIteration from None


async def test_board_squares_follow_a_reimported_card_by_slug() -> None:
    current_id = "b" * 24
    cards = MagicMock(find=MagicMock(return_value=_Cursor([{"_id": current_id, "slug": "sire"}])))
    board = {
        "_id": "board",
        "positions": [
            {"position": 1, "card": {"card_id": "a" * 24, "slug": "sire", "card_revision": 1}},
            {"position": 2, "card": {"card_id": current_id, "slug": "sire"}},
            {"position": 3, "card": {"card_id": "c" * 24, "slug": "gone"}},
            {"position": 4, "card": None},
        ],
    }
    boards = MagicMock(find=MagicMock(return_value=_Cursor([board])), update_one=AsyncMock())
    database = MagicMock()
    database.__getitem__.side_effect = {"tile_cards": cards, "event_boards": boards}.__getitem__

    assert await relink_orphaned_board_cards(database) == 1

    boards.update_one.assert_awaited_once_with(
        {"_id": "board"}, {"$set": {"positions.0.card.card_id": current_id}}
    )
