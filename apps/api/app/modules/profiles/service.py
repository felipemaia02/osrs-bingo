from datetime import UTC, datetime, timedelta
from urllib.parse import quote

from bson import ObjectId

from app.core.exceptions import AppException, NotFoundError
from app.modules.auth.schemas import CurrentUser
from app.modules.profiles.models import LinkedAccount, ProfileDocument
from app.modules.profiles.repository import ProfileRepository, RsnTakenError
from app.modules.profiles.schemas import (
    MAX_ACCOUNTS,
    MEMBER_SEARCH_LIMIT,
    AccountAdd,
    AccountResponse,
    BalanceTotals,
    MemberResponse,
    Preferences,
    ProfileResponse,
    WomStatus,
    normalize_rsn,
)
from app.modules.profiles.wom import WomClient, WomStats, WomUnavailableError

REFRESH_COOLDOWN = timedelta(hours=1)
WOM_PROFILE_URL = "https://wiseoldman.net/players/{rsn}"

RSN_TAKEN = "This account is already linked to another player"
RSN_ALREADY_YOURS = "This account is already on your profile"
TOO_MANY_ACCOUNTS = "You can link up to 10 accounts"
MAIN_NEEDS_REPLACEMENT = "Make another account the main before removing this one"
REFRESHED_RECENTLY = "Updated less than an hour ago"


def has_wom_stats(account: LinkedAccount) -> bool:
    """Counts for team balance and can join events: WOM stats stored and not marked not found.

    While WOM is unreachable, the last stored stats still count (feature 021).
    """
    return account["wom_status"] != WomStatus.NOT_FOUND and account.get("boss_kc") is not None


def main_rsn(profile: ProfileDocument | None) -> str | None:
    accounts = profile["accounts"] if profile else []
    return next((account["rsn"] for account in accounts if account["is_main"]), None)


class ProfileService:
    """Linked OSRS accounts with cached Wise Old Man stats (feature 021)."""

    def __init__(self, profiles: ProfileRepository, wom: WomClient) -> None:
        self._profiles = profiles
        self._wom = wom

    async def get(self, user: CurrentUser) -> ProfileResponse:
        return self._response(user, await self._profiles.get_or_create(user.id))

    async def members(self, user: CurrentUser, search: str) -> list[MemberResponse]:
        rows = await self._profiles.search_members(
            search.strip(), normalize_rsn(search), user.id, MEMBER_SEARCH_LIMIT
        )
        return [
            MemberResponse(
                user_id=str(row["_id"]), username=row["username"], main_rsn=main_rsn(profile)
            )
            for row, profile in rows
        ]

    async def set_preferences(self, user: CurrentUser, preferences: Preferences) -> ProfileResponse:
        await self._profiles.get_or_create(user.id)
        document = await self._profiles.save_preferences(user.id, preferences.model_dump())
        return self._response(user, document)

    async def add_account(self, user: CurrentUser, payload: AccountAdd) -> ProfileResponse:
        profile = await self._profiles.get_or_create(user.id)
        accounts = list(profile["accounts"])
        normalized = normalize_rsn(payload.rsn)
        if any(account["normalized"] == normalized for account in accounts):
            raise AppException(409, RSN_ALREADY_YOURS)
        if len(accounts) >= MAX_ACCOUNTS:
            raise AppException(409, TOO_MANY_ACCOUNTS)
        account: LinkedAccount = {
            "id": str(ObjectId()),
            "rsn": payload.rsn,
            "normalized": normalized,
            "is_main": not accounts,
            "wom_status": WomStatus.UNAVAILABLE,
        }
        await self._sync(account, track=False)
        return await self._save(user, [*accounts, account])

    async def remove_account(self, user: CurrentUser, account_id: str) -> ProfileResponse:
        accounts = await self._accounts(user)
        account = self._find(accounts, account_id)
        if account["is_main"] and len(accounts) > 1:
            raise AppException(409, MAIN_NEEDS_REPLACEMENT)
        return await self._save(user, [item for item in accounts if item["id"] != account_id])

    async def make_main(self, user: CurrentUser, account_id: str) -> ProfileResponse:
        accounts = await self._accounts(user)
        self._find(accounts, account_id)
        for account in accounts:
            account["is_main"] = account["id"] == account_id
        return await self._save(user, accounts)

    async def refresh(self, user: CurrentUser, account_id: str) -> ProfileResponse:
        accounts = await self._accounts(user)
        account = self._find(accounts, account_id)
        checked = account.get("checked_at")
        found = account["wom_status"] == WomStatus.FOUND
        # Accounts read before combat levels existed may update right away to fill them.
        complete = account.get("combat") is not None
        recent = checked is not None and self._utc(checked) > datetime.now(UTC) - REFRESH_COOLDOWN
        if found and complete and recent:
            raise AppException(429, REFRESHED_RECENTLY)
        await self._sync(account, track=False)
        return await self._save(user, accounts)

    async def track(self, user: CurrentUser, account_id: str) -> ProfileResponse:
        accounts = await self._accounts(user)
        await self._sync(self._find(accounts, account_id), track=True)
        return await self._save(user, accounts)

    async def _sync(self, account: LinkedAccount, track: bool) -> None:
        """Reads (or tracks) the RSN on WOM; on failure the last stats are kept."""
        try:
            stats = await (self._wom.track if track else self._wom.player)(account["rsn"])
        except WomUnavailableError:
            account["wom_status"] = WomStatus.UNAVAILABLE
            return
        account["checked_at"] = datetime.now(UTC)
        if stats is None:
            account["wom_status"] = WomStatus.NOT_FOUND
            return
        self._apply(account, stats)

    @staticmethod
    def _apply(account: LinkedAccount, stats: WomStats) -> None:
        account["wom_status"] = WomStatus.FOUND
        account["total_level"] = stats.total_level
        account["ehp"] = stats.ehp
        account["ehb"] = stats.ehb
        account["boss_kc"] = stats.boss_kc
        account["combat"] = stats.combat
        account["wom_updated_at"] = stats.updated_at

    async def _accounts(self, user: CurrentUser) -> list[LinkedAccount]:
        return list((await self._profiles.get_or_create(user.id))["accounts"])

    async def _save(self, user: CurrentUser, accounts: list[LinkedAccount]) -> ProfileResponse:
        try:
            document = await self._profiles.save_accounts(user.id, accounts)
        except RsnTakenError as exc:
            raise AppException(409, RSN_TAKEN) from exc
        return self._response(user, document)

    @staticmethod
    def _find(accounts: list[LinkedAccount], account_id: str) -> LinkedAccount:
        account = next((item for item in accounts if item["id"] == account_id), None)
        if account is None:
            raise NotFoundError("Account")
        return account

    @staticmethod
    def _utc(moment: datetime) -> datetime:
        return moment if moment.tzinfo else moment.replace(tzinfo=UTC)

    @classmethod
    def _utc_or_none(cls, moment: datetime | None) -> datetime | None:
        return cls._utc(moment) if moment else None

    @classmethod
    def _response(cls, user: CurrentUser, document: ProfileDocument) -> ProfileResponse:
        accounts = sorted(document["accounts"], key=lambda item: not item["is_main"])
        counted = [item for item in accounts if has_wom_stats(item)]
        return ProfileResponse(
            discord_id=user.discord_id,
            username=user.username,
            timezone=document.get("timezone"),
            activity=document.get("activity"),
            accounts=[
                AccountResponse(
                    id=item["id"],
                    rsn=item["rsn"],
                    is_main=item["is_main"],
                    wom_status=WomStatus(item["wom_status"]),
                    total_level=item.get("total_level"),
                    ehp=item.get("ehp"),
                    ehb=item.get("ehb"),
                    boss_kc=item.get("boss_kc"),
                    combat=item.get("combat"),
                    wom_updated_at=cls._utc_or_none(item.get("wom_updated_at")),
                    checked_at=cls._utc_or_none(item.get("checked_at")),
                    wom_url=WOM_PROFILE_URL.format(rsn=quote(item["rsn"])),
                )
                for item in accounts
            ],
            totals=BalanceTotals(
                boss_kc=sum(item.get("boss_kc") or 0 for item in counted),
                ehb=round(sum(item.get("ehb") or 0 for item in counted), 2),
                counted=len(counted),
                total=len(accounts),
                not_found=[
                    item["rsn"] for item in accounts if item["wom_status"] == WomStatus.NOT_FOUND
                ],
            ),
        )
