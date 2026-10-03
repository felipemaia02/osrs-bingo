from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from pymongo.errors import DuplicateKeyError

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
