from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from app.core.exceptions import AppException, NotFoundError
from app.modules.auth.schemas import CurrentUser
from app.modules.profiles.models import LinkedAccount, ProfileDocument
from app.modules.profiles.repository import RsnTakenError
from app.modules.profiles.schemas import AccountAdd, Preferences, normalize_rsn
from app.modules.profiles.service import ProfileService
from app.modules.profiles.wom import WomStats, WomUnavailableError

USER = CurrentUser(id=str(ObjectId()), discord_id="1", username="Holy Hal", is_admin=False)


def stats(boss_kc: int = 100, ehb: float = 10.5) -> WomStats:
    combat = {"attack": 99, "strength": 99, "defence": 90}
    return WomStats("Main", 2000, 900.0, ehb, boss_kc, combat, datetime(2026, 10, 1, tzinfo=UTC))


class FakeProfiles:
    """In-memory profile store that mimics the unique RSN index."""

    def __init__(self) -> None:
        self.document: ProfileDocument = {
            "_id": ObjectId(USER.id),
            "accounts": [],
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }  # type: ignore[typeddict-item]
        self.taken: set[str] = set()

    async def get_or_create(self, user_id: str) -> ProfileDocument:
        return self.document

    async def save_accounts(self, user_id: str, accounts: list[LinkedAccount]) -> ProfileDocument:
        if any(account["normalized"] in self.taken for account in accounts):
            raise RsnTakenError
        self.document = {**self.document, "accounts": [dict(a) for a in accounts]}  # type: ignore[typeddict-item]
        return self.document

    async def save_preferences(self, user_id: str, preferences: dict[str, Any]) -> ProfileDocument:
        self.document = {**self.document, **preferences}  # type: ignore[typeddict-item]
        return self.document


@pytest.fixture
def wom() -> AsyncMock:
    client = AsyncMock()
    client.player.return_value = stats()
    client.track.return_value = stats()
    return client


@pytest.fixture
def profiles() -> FakeProfiles:
    return FakeProfiles()


@pytest.fixture
def service(profiles: FakeProfiles, wom: AsyncMock) -> ProfileService:
    return ProfileService(profiles, wom)  # type: ignore[arg-type]


async def test_first_account_is_main_and_others_are_alts(service: ProfileService) -> None:
    await service.add_account(USER, AccountAdd(rsn="Main"))
    profile = await service.add_account(USER, AccountAdd(rsn="Alt  One"))

    assert [(a.rsn, a.is_main) for a in profile.accounts] == [("Main", True), ("Alt One", False)]
    assert profile.accounts[0].wom_url == "https://wiseoldman.net/players/Main"
    assert profile.accounts[0].combat == {"attack": 99, "strength": 99, "defence": 90}
    assert profile.totals.boss_kc == 200 and profile.totals.ehb == 21.0


async def test_rsn_is_unique_per_user_ignoring_case_and_separators(
    service: ProfileService, profiles: FakeProfiles
) -> None:
    await service.add_account(USER, AccountAdd(rsn="Iron_Hal"))

    with pytest.raises(AppException) as mine:
        await service.add_account(USER, AccountAdd(rsn="iron hal"))
    assert mine.value.status_code == 409

    profiles.taken.add(normalize_rsn("Zezima"))
    with pytest.raises(AppException) as other:
        await service.add_account(USER, AccountAdd(rsn="Zezima"))
    assert "another player" in other.value.detail


async def test_accounts_are_limited_to_ten(service: ProfileService) -> None:
    for index in range(10):
        await service.add_account(USER, AccountAdd(rsn=f"Acc{index}"))

    with pytest.raises(AppException):
        await service.add_account(USER, AccountAdd(rsn="Acc10"))


async def test_not_found_accounts_are_listed_and_excluded_from_totals(
    service: ProfileService, wom: AsyncMock
) -> None:
    await service.add_account(USER, AccountAdd(rsn="Main"))
    wom.player.return_value = None
    profile = await service.add_account(USER, AccountAdd(rsn="Ghost"))

    assert profile.accounts[1].wom_status == "not_found"
    assert profile.totals.counted == 1 and profile.totals.total == 2
    assert profile.totals.not_found == ["Ghost"]

    wom.track.return_value = stats(boss_kc=5)
    tracked = await service.track(USER, profile.accounts[1].id)
    assert tracked.accounts[1].wom_status == "found" and tracked.totals.boss_kc == 105


async def test_unavailable_wom_keeps_the_last_stats(
    service: ProfileService, profiles: FakeProfiles, wom: AsyncMock
) -> None:
    profile = await service.add_account(USER, AccountAdd(rsn="Main"))
    profiles.document["accounts"][0]["checked_at"] = datetime.now(UTC) - timedelta(hours=2)
    wom.player.side_effect = WomUnavailableError

    refreshed = await service.refresh(USER, profile.accounts[0].id)

    assert refreshed.accounts[0].wom_status == "unavailable"
    assert refreshed.accounts[0].boss_kc == 100
    assert refreshed.totals.counted == 1 and refreshed.totals.boss_kc == 100

    # Unavailable accounts can retry right away.
    wom.player.side_effect = None
    again = await service.refresh(USER, profile.accounts[0].id)
    assert again.accounts[0].wom_status == "found"


async def test_new_account_while_wom_is_down_is_unavailable(
    service: ProfileService, wom: AsyncMock
) -> None:
    wom.player.side_effect = WomUnavailableError

    profile = await service.add_account(USER, AccountAdd(rsn="Main"))

    assert profile.accounts[0].wom_status == "unavailable"
    assert profile.totals.counted == 0


async def test_refresh_waits_an_hour_between_updates(
    service: ProfileService, profiles: FakeProfiles, wom: AsyncMock
) -> None:
    profile = await service.add_account(USER, AccountAdd(rsn="Main"))

    with pytest.raises(AppException) as early:
        await service.refresh(USER, profile.accounts[0].id)
    assert early.value.status_code == 429

    profiles.document["accounts"][0]["checked_at"] = datetime.now(UTC) - timedelta(minutes=61)
    wom.player.return_value = stats(boss_kc=150)
    refreshed = await service.refresh(USER, profile.accounts[0].id)
    assert refreshed.accounts[0].boss_kc == 150


async def test_make_main_and_remove_rules(service: ProfileService) -> None:
    main = (await service.add_account(USER, AccountAdd(rsn="Main"))).accounts[0]
    alt = (await service.add_account(USER, AccountAdd(rsn="Alt"))).accounts[1]

    with pytest.raises(AppException):
        await service.remove_account(USER, main.id)

    swapped = await service.make_main(USER, alt.id)
    assert [(a.rsn, a.is_main) for a in swapped.accounts] == [("Alt", True), ("Main", False)]

    after = await service.remove_account(USER, main.id)
    assert [a.rsn for a in after.accounts] == ["Alt"]
    assert (await service.remove_account(USER, alt.id)).accounts == []

    with pytest.raises(NotFoundError):
        await service.make_main(USER, alt.id)


async def test_preferences_are_saved(service: ProfileService) -> None:
    profile = await service.set_preferences(
        USER,
        Preferences(timezone="America/Sao_Paulo", activity="over_3h"),  # type: ignore[arg-type]
    )

    assert profile.timezone == "America/Sao_Paulo" and profile.activity == "over_3h"
    with pytest.raises(ValueError):
        Preferences(timezone="Mars/Olympus_Mons")


def test_rsn_input_is_validated() -> None:
    assert AccountAdd(rsn="  Holy   Hal ").rsn == "Holy Hal"
    with pytest.raises(ValueError):
        AccountAdd(rsn="way-too-long-name")
    with pytest.raises(ValueError):
        AccountAdd(rsn="bad!name")


async def test_accounts_without_combat_levels_can_update_right_away(
    service: ProfileService, profiles: FakeProfiles, wom: AsyncMock
) -> None:
    profile = await service.add_account(USER, AccountAdd(rsn="Main"))
    del profiles.document["accounts"][0]["combat"]

    refreshed = await service.refresh(USER, profile.accounts[0].id)

    assert refreshed.accounts[0].combat == {"attack": 99, "strength": 99, "defence": 90}
