"""Registration documents to API responses (shared by the players and teams services)."""

from app.modules.events.models import EventDocument
from app.modules.players.models import PlayerDocument, RosterDocument
from app.modules.players.schemas import (
    AccountSnapshot,
    BuyInStatus,
    ParticipantRole,
    PlayerResponse,
    RegistrationStatus,
    RosterEntry,
)
from app.modules.profiles.combat import combat_level
from app.modules.profiles.schemas import Activity


def to_player_response(document: PlayerDocument) -> PlayerResponse:
    activity = document.get("activity")
    buy_in = document.get("buy_in")
    return PlayerResponse(
        id=str(document["_id"]),
        status=RegistrationStatus(document.get("status", RegistrationStatus.APPROVED)),
        event_id=str(document["event_id"]),
        team_id=str(document["team_id"]) if document["team_id"] is not None else None,
        display_name=document["display_name"],
        discord_username=document.get("discord_username"),
        account_id=document.get("account_id"),
        activity=Activity(activity) if activity else None,
        buy_in_status=BuyInStatus(buy_in["status"]) if buy_in else None,
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def to_roster_entry(document: RosterDocument) -> RosterEntry:
    """Admin roster row: registration, current profile experience and names (feature 023)."""
    role = document.get("role")
    account_count = document.get("account_count")
    admins = document.get("buy_in_admin") or []
    snapshots = account_snapshots(document)
    return RosterEntry(
        **to_player_response(document).model_dump(),
        role=ParticipantRole(role) if role else None,
        boss_kc_total=document.get("boss_kc_total"),
        ehb_total=document.get("ehb_total"),
        alt_count=max(account_count - 1, 0) if account_count else None,
        timezone=document.get("timezone"),
        teammates=teammate_names(document),
        buy_in_admin_name=str(admins[0]["username"]) if admins else None,
        account=next((item for item in snapshots if item.id == document.get("account_id")), None),
        accounts=snapshots,
    )


def teammate_names(document: RosterDocument) -> list[str]:
    """Each wanted teammate's main RSN, or their Discord name without one."""
    users = {user["_id"]: user for user in document.get("mate_users") or []}
    mains = {
        profile["_id"]: next(
            (acc["rsn"] for acc in profile.get("accounts", []) if acc.get("is_main")),  # type: ignore[attr-defined]
            None,
        )
        for profile in document.get("mate_profiles") or []
    }
    names = []
    for mate_id in document.get("teammate_ids") or []:
        name = mains.get(mate_id) or users.get(mate_id, {}).get("username")
        if name:
            names.append(str(name))
    return names


def for_event[Response: (PlayerResponse, RosterEntry)](
    response: Response, event: EventDocument
) -> Response:
    """Events without a buy-in show no buy-in status (registrations still start Pending)."""
    if event.get("buy_in"):
        return response
    hidden: dict[str, None] = {"buy_in_status": None}
    if isinstance(response, RosterEntry):
        hidden["buy_in_admin_name"] = None
    return response.model_copy(update=hidden)


def account_snapshots(document: RosterDocument) -> list[AccountSnapshot]:
    """Linked accounts with their WOM stats and combat level, main first."""
    rows = sorted(document.get("profile_accounts") or [], key=lambda item: not item["is_main"])
    return [
        AccountSnapshot(
            id=row["id"],
            rsn=row["rsn"],
            is_main=row["is_main"],
            wom_status=row["wom_status"],
            total_level=row.get("total_level"),
            combat_level=combat_level(row.get("combat")),
            combat=row.get("combat"),
            skills=row.get("skills"),
            ehp=row.get("ehp"),
            ehb=row.get("ehb"),
            boss_kc=row.get("boss_kc"),
        )
        for row in rows
    ]
