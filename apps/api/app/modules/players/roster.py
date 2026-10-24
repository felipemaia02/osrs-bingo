"""Registration documents to API responses (shared by the players and teams services)."""

from app.modules.players.models import PlayerDocument, RosterDocument
from app.modules.players.schemas import (
    BuyInStatus,
    ParticipantRole,
    PlayerResponse,
    RegistrationStatus,
    RosterEntry,
)
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
    accounts = document.get("account_count")
    admins = document.get("buy_in_admin") or []
    return RosterEntry(
        **to_player_response(document).model_dump(),
        role=ParticipantRole(role) if role else None,
        boss_kc_total=document.get("boss_kc_total"),
        ehb_total=document.get("ehb_total"),
        alt_count=max(accounts - 1, 0) if accounts else None,
        timezone=document.get("timezone"),
        teammates=teammate_names(document),
        buy_in_admin_name=str(admins[0]["username"]) if admins else None,
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
