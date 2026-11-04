"""Who is working on which tile (feature 061). Informational only: never changes scoring."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from bson import ObjectId

from app.core.exceptions import AppException, NotFoundError
from app.modules.activity.repository import ActivityRepository
from app.modules.activity.schemas import TeamActivityResponse, TileActivity, TileWorker
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.repository import BoardRepository
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.models import PlayerDocument
from app.modules.players.repository import PlayerRepository
from app.modules.players.schemas import RegistrationStatus
from app.modules.teams.repository import TeamRepository

MARK_LIFETIME = timedelta(days=7)
EVENT_NOT_ACTIVE = "Tiles can only be marked while the event is active"
NEEDS_TEAM = "Only players on a team can mark tiles"
UNKNOWN_TILE = "This tile isn't on the board"


@dataclass(frozen=True)
class TeamMember:
    event_id: ObjectId
    team_id: ObjectId
    player_id: ObjectId


class ActivityService:
    def __init__(
        self,
        activity: ActivityRepository,
        events: EventRepository,
        players: PlayerRepository,
        teams: TeamRepository,
        boards: BoardRepository,
    ) -> None:
        self._activity = activity
        self._events = events
        self._players = players
        self._teams = teams
        self._boards = boards

    async def own_team(self, event_id: str, user: CurrentUser) -> TeamActivityResponse:
        member = await self._require_member(event_id, user)
        return await self._team(member.event_id, member.team_id, member.player_id)

    async def start(self, event_id: str, position: int, user: CurrentUser) -> TeamActivityResponse:
        member = await self._require_member(event_id, user)
        await self._require_tile(event_id, position)
        now = datetime.now(UTC)
        await self._activity.mark(
            member.event_id, member.team_id, member.player_id, position, now, now + MARK_LIFETIME
        )
        return await self._team(member.event_id, member.team_id, member.player_id)

    async def stop(self, event_id: str, position: int, user: CurrentUser) -> TeamActivityResponse:
        member = await self._require_member(event_id, user)
        await self._activity.unmark(member.event_id, member.team_id, member.player_id, position)
        return await self._team(member.event_id, member.team_id, member.player_id)

    async def any_team(self, event_id: str, team_id: str) -> TeamActivityResponse:
        """Read-only, for the admin ranking's team board (058)."""
        team = await self._teams.get(event_id, team_id)
        if team is None:
            raise NotFoundError("Team")
        return await self._team(team["event_id"], team["_id"], None)

    async def _team(
        self, event_id: ObjectId, team_id: ObjectId, viewer: ObjectId | None
    ) -> TeamActivityResponse:
        """Marks of players still on the team; moved or removed players drop out (BR-003)."""
        members = {
            player["_id"]: player
            for player in await self._players.approved_with_team(str(event_id))
            if player["team_id"] == team_id
        }
        tiles: dict[int, list[TileWorker]] = {}
        for mark in await self._activity.for_team(event_id, team_id, datetime.now(UTC)):
            member = members.get(mark["player_id"])
            if member is not None:
                tiles.setdefault(mark["position"], []).append(_worker(mark, member, viewer))
        return TeamActivityResponse(
            tiles=[
                TileActivity(
                    position=position, players=sorted(players, key=lambda item: not item.is_you)
                )
                for position, players in sorted(tiles.items())
            ]
        )

    async def _require_member(self, event_id: str, user: CurrentUser) -> TeamMember:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        if event["status"] != EventStatus.ACTIVE:
            raise AppException(409, EVENT_NOT_ACTIVE)
        player = await self._players.get_for_user(event_id, user.id)
        team_id = player["team_id"] if player else None
        if player is None or player.get("status") != RegistrationStatus.APPROVED or not team_id:
            raise AppException(403, NEEDS_TEAM)
        return TeamMember(event_id=player["event_id"], team_id=team_id, player_id=player["_id"])

    async def _require_tile(self, event_id: str, position: int) -> None:
        board = await self._boards.get_by_event(event_id)
        positions = {item["position"] for item in (board or {}).get("positions", [])}
        if position not in positions:
            raise AppException(404, UNKNOWN_TILE)


def _worker(mark: dict[str, Any], member: PlayerDocument, viewer: ObjectId | None) -> TileWorker:
    return TileWorker(
        player_id=str(member["_id"]),
        name=member["display_name"],
        since=mark["since"],
        expires_at=mark["expires_at"],
        is_you=member["_id"] == viewer,
    )
