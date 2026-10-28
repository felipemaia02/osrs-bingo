from unittest.mock import AsyncMock, MagicMock

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.modules.players.models import NewRegistration
from app.modules.players.repository import PlayerRepository
from app.modules.players.schemas import PlayerUpdate, RegistrationStatus

TEAMMATE = str(ObjectId())
REGISTRATION = NewRegistration("Thunder Crab", str(ObjectId()), "over_3h", [TEAMMATE])


async def test_registration_is_persisted_without_team() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.insert_one = AsyncMock()
    repository = PlayerRepository(database)
    event_id = str(ObjectId())

    result = await repository.create(event_id, REGISTRATION, str(ObjectId()))

    assert result is not None
    assert result["event_id"] == ObjectId(event_id)
    assert result["team_id"] is None
    assert result["status"] == RegistrationStatus.PENDING
    assert isinstance(result["user_id"], ObjectId)
    assert result["normalized_display_name"] == "thunder crab"
    assert result["teammate_ids"] == [ObjectId(TEAMMATE)]
    assert result["buy_in"]["status"] == "pending" and result["buy_in"]["admin_id"] is None
    assert result["agreements_accepted_at"] == result["created_at"]
    collection.insert_one.assert_awaited_once_with(result)


async def test_concurrent_duplicate_registration_is_reported() -> None:
    database = MagicMock()
    database.__getitem__.return_value.insert_one = AsyncMock(side_effect=DuplicateKeyError("name"))

    result = await PlayerRepository(database).create(str(ObjectId()), REGISTRATION, str(ObjectId()))

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
    assert update[0]["$set"]["team_id"] is None
    assert update[0]["$set"]["role"]["$cond"][1] is None  # a moved captain loses the role
    assert "event_id" not in update[0]["$set"]
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
    assert update[0]["$set"]["status"] == RegistrationStatus.REMOVED
    assert update[0]["$set"]["team_id"] is None
    assert "role" in update[0]["$set"]
    assert "_id" not in update[0]["$set"]
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


async def test_page_joins_discord_name_and_searches_both_names_with_bounds() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    row = {"_id": ObjectId(), "display_name": "Crab", "discord_username": "crabby"}
    collection.find_one = AsyncMock(return_value=None)  # boss KC settings: defaults (039)
    collection.aggregate.return_value.to_list = AsyncMock(
        return_value=[{"items": [row], "total": [{"value": 42}]}]
    )
    event_id, team_id = str(ObjectId()), str(ObjectId())

    result = await PlayerRepository(database).page(
        event_id,
        status=RegistrationStatus.APPROVED,
        assigned=True,
        search="  Crab.* ",
        team_id=team_id,
        offset=25,
        limit=25,
    )

    pipeline = collection.aggregate.call_args.args[0]
    assert pipeline[0] == {
        "$match": {
            "event_id": ObjectId(event_id),
            "status": RegistrationStatus.APPROVED,
            "team_id": ObjectId(team_id),
        }
    }
    assert pipeline[1]["$lookup"]["from"] == "users"
    assert pipeline[1]["$lookup"]["localField"] == "user_id"
    search = pipeline[4]["$match"]["$or"]
    assert search[0] == {"normalized_display_name": {"$regex": r"crab\.\*"}}
    assert search[1] == {"discord_username": {"$regex": r"Crab\.\*", "$options": "i"}}
    assert pipeline[5]["$lookup"]["from"] == "player_profiles"
    items = pipeline[-1]["$facet"]["items"]
    assert items[:3] == [
        {"$sort": {"ehb_total": -1, "normalized_display_name": 1, "_id": 1}},
        {"$skip": 25},
        {"$limit": 25},
    ]
    assert [stage["$lookup"]["as"] for stage in items[3:]] == [
        "mate_users",
        "mate_profiles",
        "buy_in_admin",
    ]
    assert result == ([row], 42)


async def test_page_without_search_or_rows_returns_an_empty_page() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.find_one = AsyncMock(return_value=None)  # boss KC settings: defaults (039)
    collection.aggregate.return_value.to_list = AsyncMock(return_value=[{"items": [], "total": []}])
    result = await PlayerRepository(database).page(
        str(ObjectId()),
        status=None,
        assigned=None,
        search="  ",
        team_id=None,
        offset=0,
        limit=25,
    )
    pipeline = collection.aggregate.call_args.args[0]
    assert pipeline[0]["$match"]["status"] == {"$in": ["pending", "approved"]}
    assert all("$facet" in stage or "$or" not in str(stage) for stage in pipeline)
    assert result == ([], 0)


async def test_selected_updates_are_event_scoped_and_state_guarded() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.update_many = AsyncMock(return_value=MagicMock(modified_count=2))
    repository = PlayerRepository(database)
    event_id, ids = str(ObjectId()), [str(ObjectId()), str(ObjectId()), "bad-id"]

    assert await repository.approve_selected(event_id, ids) == 2
    query, update = collection.update_many.call_args.args
    assert query["_id"] == {"$in": [ObjectId(ids[0]), ObjectId(ids[1])]}
    assert query["event_id"] == ObjectId(event_id)
    assert query["status"] == RegistrationStatus.PENDING
    assert update[0]["$set"]["status"] == RegistrationStatus.APPROVED
    assert "role" not in update[0]["$set"]

    await repository.remove_selected(event_id, ids)
    query, update = collection.update_many.call_args.args
    assert query["status"] == {"$in": [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]}
    assert update[0]["$set"]["status"] == RegistrationStatus.REMOVED
    assert update[0]["$set"]["team_id"] is None
    assert "role" in update[0]["$set"]


async def test_counts_are_event_scoped_and_exclude_removed() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.count_documents = AsyncMock(side_effect=[3, 4, 5])
    event_id = str(ObjectId())
    assert await PlayerRepository(database).counts(event_id) == {
        "pending": 3,
        "unassigned": 4,
        "assigned": 5,
    }
    queries = [call.args[0] for call in collection.count_documents.await_args_list]
    assert all(query["event_id"] == ObjectId(event_id) for query in queries)
    assert [query["status"] for query in queries] == ["pending", "approved", "approved"]
    assert queries[1]["team_id"] is None
    assert queries[2]["team_id"] == {"$ne": None}
