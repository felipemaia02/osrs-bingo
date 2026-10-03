from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId

from app.core.exceptions import AppException, ConflictError
from app.modules.administration.repository import AdministrationRepository
from app.modules.administration.service import AdministrationService
from app.modules.auth.schemas import CurrentUser

ACTOR = CurrentUser(id=str(ObjectId()), discord_id="111", username="Admin", is_admin=True)
TARGET_ID = str(ObjectId())


def role_service():
    repository = AsyncMock(spec=AdministrationRepository)
    repository.get_user.return_value = {
        "_id": ObjectId(TARGET_ID),
        "discord_id": "222",
        "username": "Player",
    }
    repository.roles.return_value = {"admin_ids": ["111"], "revision": 1}
    repository.change_roles.return_value = True
    return AdministrationService(repository), repository


async def test_grant_is_persisted_with_audit_without_discord_role_checks() -> None:
    service, repository = role_service()
    result = await service.change_role(ACTOR, TARGET_ID, True)
    assert result.is_admin
    version, members, audit = repository.change_roles.call_args.args
    assert version == 1 and members == ["111", "222"]
    assert audit["actor_id"] == ACTOR.id and audit["target_id"] == TARGET_ID
    assert audit["action"] == "grant_admin"


async def test_last_admin_cannot_be_removed() -> None:
    service, repository = role_service()
    repository.get_user.return_value["discord_id"] = "111"
    with pytest.raises(ConflictError, match="last administrator"):
        await service.change_role(ACTOR, TARGET_ID, False)
    repository.change_roles.assert_not_awaited()


async def test_concurrent_revocation_rechecks_actor_after_revision_conflict() -> None:
    service, repository = role_service()
    repository.roles.side_effect = [
        {"admin_ids": ["111", "222"], "revision": 1},
        {"admin_ids": ["222"], "revision": 2},
    ]
    repository.change_roles.return_value = False
    with pytest.raises(AppException, match="Administrator access required"):
        await service.change_role(ACTOR, TARGET_ID, False)
    assert repository.change_roles.await_count == 1


async def test_concurrent_last_admin_change_cannot_leave_empty_membership() -> None:
    service, repository = role_service()
    repository.get_user.return_value["discord_id"] = "111"
    repository.roles.side_effect = [
        {"admin_ids": ["111", "222"], "revision": 1},
        {"admin_ids": ["111"], "revision": 2},
    ]
    repository.change_roles.return_value = False
    with pytest.raises(ConflictError, match="last administrator"):
        await service.change_role(ACTOR, TARGET_ID, False)
    assert repository.change_roles.await_count == 1


async def test_initialization_does_not_overwrite_existing_roles() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.update_one = AsyncMock()
    repository = AdministrationRepository(database)
    await repository.initialize([])
    collection.update_one.assert_not_awaited()
    await repository.initialize(["111"])
    query, update = collection.update_one.call_args.args
    assert query == {"_id": "global-administrators"}
    assert set(update) == {"$setOnInsert"}
    assert update["$setOnInsert"]["admin_ids"] == ["111"]


async def test_role_update_and_audit_share_atomic_revision_write() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
    assert await AdministrationRepository(database).change_roles(
        3, ["111"], {"action": "revoke_admin"}
    )
    query, update = collection.update_one.call_args.args
    assert query["revision"] == 3
    assert update["$inc"] == {"revision": 1}
    assert update["$push"] == {"audit": {"action": "revoke_admin"}}


async def test_directory_search_treats_regex_input_as_literal_and_bounds_results() -> None:
    database = MagicMock()
    collection = database.__getitem__.return_value
    collection.count_documents = AsyncMock(return_value=1)
    cursor = collection.find.return_value.sort.return_value.skip.return_value.limit.return_value
    cursor.__aiter__.return_value = [{"username": "Crab.*"}]

    users, total = await AdministrationRepository(database).directory("Crab.*", 25, 25)

    query = {"username": {"$regex": r"Crab\.\*", "$options": "i"}}
    collection.count_documents.assert_awaited_once_with(query)
    collection.find.assert_called_once_with(query)
    collection.find.return_value.sort.return_value.skip.assert_called_once_with(25)
    collection.find.return_value.sort.return_value.skip.return_value.limit.assert_called_once_with(
        25
    )
    assert users == [{"username": "Crab.*"}] and total == 1
