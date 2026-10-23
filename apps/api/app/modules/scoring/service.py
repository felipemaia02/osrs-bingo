from dataclasses import dataclass
from datetime import UTC, datetime

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
from app.modules.players.schemas import RegistrationStatus
from app.modules.scoring.engine import (
    AcceptedDrop,
    LineBonuses,
    TeamScore,
    Tile,
    competition_positions,
    contributions,
    decimal,
    score_team,
)
from app.modules.scoring.schemas import (
    DropProgressResponse,
    PlayerContribution,
    RankingResponse,
    RankingTeam,
    TeamScoreResponse,
    TileProgressResponse,
)
from app.modules.submissions.repository import SubmissionRepository
from app.modules.teams.models import TeamDocument
from app.modules.teams.repository import TeamRepository

CONTRIBUTION_DECIMALS = 4
SCORE_NOT_AVAILABLE = "Team scores are available once the event is active"
NOT_ON_A_TEAM = "Only approved players with a team have a team score"
VISIBLE_STATUSES = {EventStatus.ACTIVE, EventStatus.FINISHED}


@dataclass(frozen=True)
class ScoringInputs:
    event: EventDocument
    tiles: list[Tile]
    size: int
    drops: list[AcceptedDrop]
    bonuses: LineBonuses


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
        player = await self._players.get_for_user(event_id, user.id)
        team_id = player.get("team_id") if player else None
        if player is None or player.get("status") != RegistrationStatus.APPROVED or not team_id:
            raise AppException(403, NOT_ON_A_TEAM)
        team = await self._teams.get(event_id, str(team_id))
        if team is None:
            raise AppException(403, NOT_ON_A_TEAM)
        score = score_team(str(team_id), inputs.tiles, inputs.size, inputs.drops, inputs.bonuses)
        return self._team_response(inputs, team, score)

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
                )
            )
        return RankingResponse(
            event_id=event_id,
            event_name=inputs.event["name"],
            event_status=inputs.event["status"],
            size=inputs.size,
            tile_count=len(inputs.tiles),
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
            )
            for item in positions
        ]
        drops = [
            AcceptedDrop(
                team_id=str(document["team_id"]),
                player_id=str(document["player_id"]),
                position=document["position"],
                drop_key=document["drop_key"] or "",
                drop_name=document["drop_name"] or "",
                weight=decimal(document["progress_weight"] or 0),
                quantity=document["quantity"],
            )
            for document in await self._submissions.accepted_drops(event["_id"])
        ]
        return ScoringInputs(
            event=event,
            tiles=tiles,
            size=int(board.get("size", DEFAULT_BOARD_SIZE)) if board else DEFAULT_BOARD_SIZE,
            drops=drops,
            bonuses=LineBonuses(row=event.get("row_bonus"), column=event.get("column_bonus")),
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
            tile_count=len(inputs.tiles),
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
