from app.core.config import Settings
from app.core.exceptions import ConflictError, DomainValidationError, NotFoundError
from app.modules.events.models import EventDocument
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.repository import PlayerRepository
from app.modules.players.roster import for_event, to_roster_entry
from app.modules.players.schemas import RegistrationStatus
from app.modules.teams.models import TeamDocument
from app.modules.teams.repository import TeamRepository
from app.modules.teams.schemas import (
    DraftCaptain,
    DraftPreviewResponse,
    TeamBalance,
    TeamBalanceResponse,
    TeamCreate,
    TeamResponse,
    TeamUpdate,
)

TEAM_CONFLICT_DETAIL = "Team name already exists in this event"
READ_ONLY_EVENT_DETAIL = "Only draft events can be changed"
TEAM_EMBLEMS_DISABLED_DETAIL = "Team emblems are disabled"
# A team within ±15% of the average EHB per team counts as balanced (feature 023).
BALANCE_TOLERANCE_PERCENT = 15
PERCENT = 100
# More than any clan event; the preview lists every available player at once.
DRAFT_PREVIEW_LIMIT = 500


class TeamService:
    def __init__(
        self,
        teams: TeamRepository,
        players: PlayerRepository,
        events: EventRepository,
        settings: Settings,
    ) -> None:
        self._teams = teams
        self._players = players
        self._events = events
        self._settings = settings

    async def create(self, event_id: str, payload: TeamCreate) -> TeamResponse:
        await self._require_draft_event(event_id)
        self._require_emblems_enabled(payload.emblem_url)
        document = await self._teams.create(
            event_id, payload, include_emblem=self._settings.team_emblems_enabled
        )
        if document is None:
            raise ConflictError(TEAM_CONFLICT_DETAIL)
        return self._to_response(document, 0)

    async def list(self, event_id: str) -> list[TeamResponse]:
        await self._require_event(event_id)
        documents = await self._teams.list(event_id)
        counts = await self._players.count_by_team_ids([document["_id"] for document in documents])
        return [
            self._to_response(document, counts.get(document["_id"], 0)) for document in documents
        ]

    async def balance(self, event_id: str) -> TeamBalanceResponse:
        """Each team's experience versus the average per team (feature 023, FR-001)."""
        await self._require_event(event_id)
        teams = await self._teams.list(event_id)
        experience = {row["_id"]: row for row in await self._players.team_experience(event_id)}
        totals = [experience.get(team["_id"]) for team in teams]
        ehb = [round(row["ehb_total"], 2) if row else 0.0 for row in totals]
        sizes = [row["player_count"] if row else 0 for row in totals]
        average = round(sum(ehb) / len(teams), 2) if teams else 0.0
        largest = max(sizes, default=0)
        balance = []
        for team, row, team_ehb, size in zip(teams, totals, ehb, sizes, strict=True):
            versus = round((team_ehb - average) / average * PERCENT) if average else 0
            balance.append(
                TeamBalance(
                    team_id=str(team["_id"]),
                    name=team["name"],
                    color=team["color"],
                    emblem_url=team.get("emblem_url"),
                    player_count=size,
                    boss_kc_total=row["boss_kc_total"] if row else 0,
                    ehb_total=team_ehb,
                    captain=row["captains"][0] if row and row["captains"] else None,
                    ehb_vs_average=versus,
                    players_short=largest - size,
                    balanced=abs(versus) <= BALANCE_TOLERANCE_PERCENT,
                )
            )
        return TeamBalanceResponse(average_ehb=average, teams=balance)

    async def draft_preview(self, event_id: str) -> DraftPreviewResponse:
        """Captains per team and approved players without a team (feature 024)."""
        event = await self._require_event(event_id)
        teams = await self._teams.list(event_id)
        captains = {row["team_id"]: row for row in await self._players.captains(event_id)}
        players, _ = await self._players.page(
            event_id,
            status=RegistrationStatus.APPROVED,
            assigned=False,
            search="",
            team_id=None,
            offset=0,
            limit=DRAFT_PREVIEW_LIMIT,
        )
        return DraftPreviewResponse(
            captains=[
                DraftCaptain(
                    team_id=str(team["_id"]),
                    team_name=team["name"],
                    color=team["color"],
                    emblem_url=team.get("emblem_url"),
                    captain=captain["display_name"] if captain else None,
                    captain_ehb=captain.get("ehb_total") if captain else None,
                )
                for team in teams
                for captain in [captains.get(team["_id"])]
            ],
            players=[for_event(to_roster_entry(player), event) for player in players],
        )

    async def update(self, event_id: str, team_id: str, payload: TeamUpdate) -> TeamResponse:
        await self._require_draft_event(event_id)
        self._require_emblems_enabled(payload.emblem_url)
        document = await self._teams.update(
            event_id, team_id, payload, include_emblem=self._settings.team_emblems_enabled
        )
        if document is None:
            if await self._teams.get(event_id, team_id) is None:
                raise NotFoundError("Team")
            raise ConflictError(TEAM_CONFLICT_DETAIL)
        return self._to_response(document, 0)

    async def _require_event(self, event_id: str) -> EventDocument:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        return event

    async def _require_draft_event(self, event_id: str) -> None:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        if event["status"] != EventStatus.DRAFT:
            raise ConflictError(READ_ONLY_EVENT_DETAIL)

    def _require_emblems_enabled(self, emblem_url: str | None) -> None:
        if emblem_url is not None and not self._settings.team_emblems_enabled:
            raise DomainValidationError(TEAM_EMBLEMS_DISABLED_DETAIL)

    @staticmethod
    def _to_response(document: TeamDocument, member_count: int) -> TeamResponse:
        return TeamResponse(
            id=str(document["_id"]),
            event_id=str(document["event_id"]),
            name=document["name"],
            color=document["color"],
            emblem_url=document.get("emblem_url"),
            member_count=member_count,
            created_at=document["created_at"],
            updated_at=document["updated_at"],
        )
