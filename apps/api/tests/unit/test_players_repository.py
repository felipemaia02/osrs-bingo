from unittest.mock import AsyncMock, MagicMock

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.modules.players.repository import PlayerRepository
from app.modules.players.schemas import PlayerCreate, PlayerUpdate, RegistrationStatus


async def test_registration_is_persisted_without_team() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.insert_one = AsyncMock()
    repository = PlayerRepository(database)
    event_id = str(ObjectId())

    result = await repository.create(
        event_id, PlayerCreate(display_name="Thunder Crab"), str(ObjectId())
    )

    assert result is not None
    assert result["event_id"] == ObjectId(event_id)
    assert result["team_id"] is None
    assert result["status"] == RegistrationStatus.PENDING
    assert isinstance(result["user_id"], ObjectId)
    assert result["normalized_display_name"] == "thunder crab"
    collection.insert_one.assert_awaited_once_with(result)


async def test_concurrent_duplicate_registration_is_reported() -> None:
    database = MagicMock()
    database.__getitem__.return_value.insert_one = AsyncMock(side_effect=DuplicateKeyError("name"))

    result = await PlayerRepository(database).create(
        str(ObjectId()), PlayerCreate(display_name="Thunder Crab"), str(ObjectId())
    )

    assert result is None


async def test_unassignment_updates_existing_registration_without_deleting_it() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.find_one_and_update = AsyncMock()
    event_id, player_id = str(ObjectId()), str(ObjectId())

    await PlayerRepository(database).update(event_id, player_id, PlayerUpdate(team_id=None))

    query, update = collection.find_one_and_update.call_args.args
    assert query == {
        "_id": ObjectId(player_id),
        "event_id": ObjectId(event_id),
        "status": RegistrationStatus.APPROVED,
    }
    assert update["$set"]["team_id"] is None
    assert "event_id" not in update["$set"]
    collection.delete_one.assert_not_called()


async def test_approve_all_filters_event_and_pending_status() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.update_many = AsyncMock(return_value=MagicMock(modified_count=3))
    event_id = str(ObjectId())
    assert await PlayerRepository(database).approve_all(event_id) == 3
    query, update = collection.update_many.call_args.args
    assert query == {"event_id": ObjectId(event_id), "status": RegistrationStatus.PENDING}
    assert update["$set"]["status"] == RegistrationStatus.APPROVED
    assert "team_id" not in update["$set"]


async def test_removal_retains_identity_and_clears_team() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.find_one_and_update = AsyncMock()
    event_id, player_id = str(ObjectId()), str(ObjectId())
    await PlayerRepository(database).remove(event_id, player_id)
    query, update = collection.find_one_and_update.call_args.args
    assert query["event_id"] == ObjectId(event_id)
    assert query["status"] == {"$in": [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]}
    assert update["$set"]["status"] == RegistrationStatus.REMOVED
    assert update["$set"]["team_id"] is None
    assert "_id" not in update["$set"]
    collection.delete_one.assert_not_called()


async def test_individual_approval_cannot_revive_removed_or_already_approved_records() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.find_one_and_update = AsyncMock(return_value=None)
    event_id, player_id = str(ObjectId()), str(ObjectId())
    assert await PlayerRepository(database).approve(event_id, player_id) is None
    query, update = collection.find_one_and_update.call_args.args
    assert query == {
        "event_id": ObjectId(event_id),
        "_id": ObjectId(player_id),
        "status": RegistrationStatus.PENDING,
    }
    assert update["$set"]["status"] == RegistrationStatus.APPROVED
