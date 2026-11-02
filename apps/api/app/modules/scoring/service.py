from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from fractions import Fraction
from typing import Any

from bson import ObjectId

from app.core.exceptions import AppException, NotFoundError
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.repository import BoardRepository
from app.modules.boards.schemas import DEFAULT_BOARD_SIZE
from app.modules.events.models import EventDocument
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.models import PlayerDocument
from app.modules.players.repository import PlayerRepository
from app.modules.players.roster import to_roster_entry
from app.modules.players.schemas import RegistrationStatus
from app.modules.scoring.engine import (
    AcceptedDrop,
    LineBonuses,
    TeamScore,
    Tile,
    competition_positions,
    contributions,
    decimal,
    drop_points,
    score_team,
)
from app.modules.scoring.schemas import (
    DropProgressResponse,
    PlayerContribution,
    RankingResponse,
    RankingTeam,
    TeamDrop,
    TeamHomeResponse,
    TeamMember,
    TeamScoreResponse,
    TileProgressResponse,
)
from app.modules.submissions.repository import SubmissionRepository
from app.modules.teams.models import TeamDocument
from app.modules.teams.repository import TeamRepository

CONTRIBUTION_DECIMALS = 4
SCORE_NOT_AVAILABLE = "Team scores are available once the event is active"
NOT_ON_A_TEAM = "Only approved players with a team have a team score"
TEAM_PAGE_NOT_AVAILABLE = "Team pages are available once the event is active"
NOT_ON_A_TEAM_PAGE = "Only approved players with a team have a team page"
RECENT_DROPS_LIMIT = 10
TEAM_MEMBERS_LIMIT = 500
VISIBLE_STATUSES = {EventStatus.ACTIVE, EventStatus.FINISHED}


@dataclass(frozen=True)
class ScoringInputs:
    event: EventDocument
    tiles: list[Tile]
    size: int
    drops: list[AcceptedDrop]
    bonuses: LineBonuses
    # (position, drop key) -> weight of the card now on that square (036).
    weights: dict[tuple[int, str], Decimal]

    @property
    def grid_count(self) -> int:
        return sum(1 for tile in self.tiles if not tile.bonus)


class ScoringService:
    """Loads one event's inputs and delegates every rule to `scoring.engine`."""

    def __init__(
        self,
        events: EventRepository,
        boards: BoardRepository,
        teams: TeamRepository,
        players: PlayerRepository,
        submissions: SubmissionRepository,
    ) -> None:
        self._events = events
        self._boards = boards
        self._teams = teams
        self._players = players
        self._submissions = submissions

    async def own_team(self, event_id: str, user: CurrentUser) -> TeamScoreResponse:
        inputs = await self._inputs(event_id)
        if inputs.event["status"] not in VISIBLE_STATUSES:
            raise AppException(404, SCORE_NOT_AVAILABLE)
        team = await self._own_team(event_id, user, NOT_ON_A_TEAM)
        score = score_team(
            str(team["_id"]), inputs.tiles, inputs.size, inputs.drops, inputs.bonuses
        )
        return self._team_response(inputs, team, score)

    async def team_score(self, event_id: str, team_id: str) -> TeamScoreResponse:
        """Any team's board progress, for admins (feature 058)."""
        inputs = await self._inputs(event_id)
        team = await self._teams.get(event_id, team_id)
        if team is None:
            raise NotFoundError("Team")
        score = score_team(team_id, inputs.tiles, inputs.size, inputs.drops, inputs.bonuses)
        return self._team_response(inputs, team, score)

    async def own_team_home(self, event_id: str, user: CurrentUser) -> TeamHomeResponse:
        """The viewer's own team: members ranked by their points in it and the newest
        accepted drops (feature 050). The team always comes from the caller's registration."""
        inputs = await self._inputs(event_id)
        if inputs.event["status"] not in VISIBLE_STATUSES:
            raise AppException(404, TEAM_PAGE_NOT_AVAILABLE)
        team = await self._own_team(event_id, user, NOT_ON_A_TEAM_PAGE)
        team_key = str(team["_id"])
        # Only drops this team earned: a player who moved keeps them with the old team (EC-002).
        team_drops = [drop for drop in inputs.drops if drop.team_id == team_key]
        points = contributions(inputs.tiles, team_drops)
        drop_counts: dict[str, int] = {}
        for drop in team_drops:
            drop_counts[drop.player_id] = drop_counts.get(drop.player_id, 0) + 1
        documents, _ = await self._players.page(
            event_id,
            status=RegistrationStatus.APPROVED,
            assigned=None,
            search="",
            team_id=team_key,
            offset=0,
            limit=TEAM_MEMBERS_LIMIT,
        )
        roster = [to_roster_entry(document) for document in documents]
        positions = competition_positions(
            [(entry.id, points.get(entry.id, Fraction(0))) for entry in roster]
        )
        members = sorted(
            (
                TeamMember(
                    player_id=entry.id,
                    display_name=entry.display_name,
                    discord_username=entry.discord_username,
                    role=entry.role,
                    timezone=entry.timezone,
                    activity=entry.activity,
                    position=positions[entry.id][0],
                    tied=positions[entry.id][1],
                    points=round(float(points.get(entry.id, 0)), CONTRIBUTION_DECIMALS),
                    drop_count=drop_counts.get(entry.id, 0),
                )
                for entry in roster
            ),
            key=lambda member: (member.position, member.display_name.casefold()),
        )
        names = {member.player_id: member.display_name for member in members}
        return TeamHomeResponse(
            event_id=event_id,
            team_id=team_key,
            team_name=team["name"],
            team_color=team.get("color"),
            emblem_url=team.get("emblem_url"),
            members=members,
            recent_drops=await self._recent_drops(inputs, team["_id"], names),
        )

    async def _own_team(self, event_id: str, user: CurrentUser, refusal: str) -> TeamDocument:
        player = await self._players.get_for_user(event_id, user.id)
        team_id = player.get("team_id") if player else None
        if player is None or player.get("status") != RegistrationStatus.APPROVED or not team_id:
            raise AppException(403, refusal)
        team = await self._teams.get(event_id, str(team_id))
        if team is None:
            raise AppException(403, refusal)
        return team

    async def _recent_drops(
        self, inputs: ScoringInputs, team_id: ObjectId, names: dict[str, str]
    ) -> list[TeamDrop]:
        documents = await self._submissions.recent_accepted_drops(
            inputs.event["_id"], team_id, RECENT_DROPS_LIMIT
        )
        # Drops by players no longer on the team still show who got them.
        missing = [doc["player_id"] for doc in documents if str(doc["player_id"]) not in names]
        if missing:
            extra = await self._players.get_many(missing)
            names = {**names, **{str(key): value["display_name"] for key, value in extra.items()}}
        tiles = {tile.position: tile for tile in inputs.tiles}
        rows = []
        for document in documents:
            weight = inputs.weights.get((document["position"], document.get("drop_key") or ""))
            gained = (
                drop_points(tiles.get(document["position"]), weight, document["quantity"])
                if weight is not None
                else Fraction(0)
            )
            rows.append(
                TeamDrop(
                    submission_id=str(document["_id"]),
                    player_name=names.get(str(document["player_id"]), "—"),
                    card_name=document["card_name"],
                    drop_name=document.get("drop_name"),
                    quantity=document["quantity"],
                    points=round(float(gained), CONTRIBUTION_DECIMALS),
                    accepted_at=document.get("reviewed_at") or document["submitted_at"],
                )
            )
        return rows

    async def tile_progress(
        self, event_id: str, team_id: str, position: int
    ) -> tuple[float, float, bool] | None:
        """A team's progress, requirement and completion on one tile (review context, 035)."""
        inputs = await self._inputs(event_id)
        score = score_team(team_id, inputs.tiles, inputs.size, inputs.drops, inputs.bonuses)
        result = score.tiles.get(position)
        if result is None:
            return None
        return float(result.progress), float(result.tile.requirement), result.complete

    async def ranking(self, event_id: str) -> RankingResponse:
        inputs = await self._inputs(event_id)
        teams = await self._teams.list(event_id)
        assigned = await self._players.list_assigned(event_id)
        scores = {
            str(team["_id"]): score_team(
                str(team["_id"]), inputs.tiles, inputs.size, inputs.drops, inputs.bonuses
            )
            for team in teams
        }
        positions = competition_positions([(key, score.total) for key, score in scores.items()])
        members: dict[str, int] = {}
        for player in assigned:
            members[str(player["team_id"])] = members.get(str(player["team_id"]), 0) + 1

        ranked = sorted(teams, key=lambda team: positions[str(team["_id"])][0])
        team_rows = []
        for team in ranked:
            key = str(team["_id"])
            score = scores[key]
            position, tied = positions[key]
            team_rows.append(
                RankingTeam(
                    position=position,
                    tied=tied,
                    team_id=key,
                    team_name=team["name"],
                    team_color=team.get("color"),
                    member_count=members.get(key, 0),
                    total=float(score.total),
                    tile_points=float(score.tile_points),
                    completed_tiles=score.completed_tiles,
                    completed_rows=len(score.completed_rows),
                    row_points=float(score.row_points),
                    completed_columns=len(score.completed_columns),
                    column_points=float(score.column_points),
                    bonus_points=float(score.bonus_points),
                    completed_bonus=score.completed_bonus,
                )
            )
        return RankingResponse(
            event_id=event_id,
            event_name=inputs.event["name"],
            event_status=inputs.event["status"],
            size=inputs.size,
            tile_count=inputs.grid_count,
            bonus_count=len(inputs.tiles) - inputs.grid_count,
            row_bonus=inputs.bonuses.row,
            column_bonus=inputs.bonuses.column,
            teams=team_rows,
            players=await self._contributions(inputs, assigned),
            calculated_at=datetime.now(UTC),
        )

    async def _contributions(
        self, inputs: ScoringInputs, assigned: list[PlayerDocument]
    ) -> list[PlayerContribution]:
        """Every approved player with a team, plus anyone else who has accepted drops."""
        totals = contributions(inputs.tiles, inputs.drops)
        players = {str(player["_id"]): player for player in assigned}
        missing = [key for key in totals if key not in players]
        if missing:
            extra = await self._players.get_many([ObjectId(key) for key in missing])
            players.update({str(key): value for key, value in extra.items()})
        rows = [
            PlayerContribution(
                player_id=key,
                display_name=player["display_name"],
                team_id=str(player["team_id"]) if player.get("team_id") else None,
                contribution=round(float(totals.get(key, 0)), CONTRIBUTION_DECIMALS),
            )
            for key, player in players.items()
        ]
        return sorted(rows, key=lambda row: (-row.contribution, row.display_name.casefold()))

    async def _inputs(self, event_id: str) -> ScoringInputs:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        board = await self._boards.get_by_event(event_id)
        positions = board.get("positions", []) if board else []
        tiles = [
            Tile(
                position=item["position"],
                row=item["row"],
                column=item["column"],
                score=decimal(item["card"]["tile_score"]),
                requirement=decimal(item["card"]["completion_requirement"]),
                bonus=bool(item.get("bonus", False)),
            )
            for item in positions
        ]
        # A square fixed during the event (036) scores every accepted drop with its card's
        # current weight; drops no longer on the card stop counting.
        weights = current_weights(positions)
        drops = [
            AcceptedDrop(
                team_id=str(document["team_id"]),
                player_id=str(document["player_id"]),
                position=document["position"],
                drop_key=document["drop_key"] or "",
                drop_name=document["drop_name"] or "",
                weight=weights[(document["position"], document["drop_key"] or "")],
                quantity=document["quantity"],
            )
            for document in await self._submissions.accepted_drops(event["_id"])
            if (document["position"], document["drop_key"] or "") in weights
        ]
        return ScoringInputs(
            event=event,
            tiles=tiles,
            size=int(board.get("size", DEFAULT_BOARD_SIZE)) if board else DEFAULT_BOARD_SIZE,
            drops=drops,
            weights=weights,
            bonuses=LineBonuses(
                row=board.get("row_bonus") if board else None,
                column=board.get("column_bonus") if board else None,
            ),
        )

    @staticmethod
    def _team_response(
        inputs: ScoringInputs, team: TeamDocument, score: TeamScore
    ) -> TeamScoreResponse:
        return TeamScoreResponse(
            event_id=str(inputs.event["_id"]),
            team_id=str(team["_id"]),
            team_name=team["name"],
            team_color=team.get("color"),
            total=float(score.total),
            tile_points=float(score.tile_points),
            completed_tiles=score.completed_tiles,
            tile_count=inputs.grid_count,
            bonus_points=float(score.bonus_points),
            completed_bonus=score.completed_bonus,
            bonus_count=len(inputs.tiles) - inputs.grid_count,
            completed_rows=score.completed_rows,
            completed_columns=score.completed_columns,
            row_points=float(score.row_points),
            column_points=float(score.column_points),
            row_bonus=inputs.bonuses.row,
            column_bonus=inputs.bonuses.column,
            tiles=[
                TileProgressResponse(
                    position=result.tile.position,
                    row=result.tile.row,
                    column=result.tile.column,
                    bonus=result.tile.bonus,
                    progress=float(result.progress),
                    requirement=float(result.tile.requirement),
                    complete=result.complete,
                    points=float(result.points),
                    drops=[
                        DropProgressResponse(
                            drop_key=count.drop_key,
                            drop_name=count.drop_name,
                            count=count.count,
                            progress=float(count.progress),
                        )
                        for count in result.drops.values()
                    ],
                )
                for result in sorted(score.tiles.values(), key=lambda item: item.tile.position)
            ],
            calculated_at=datetime.now(UTC),
        )


def current_weights(positions: list[dict[str, Any]]) -> dict[tuple[int, str], Decimal]:
    """(position, drop key) -> progress weight of the card now on that square."""
    return {
        (item["position"], drop["key"]): decimal(drop["progress_weight"])
        for item in positions
        for drop in item["card"].get("drops", [])
    }
