from datetime import UTC, datetime
from typing import Any

from bson import ObjectId

from app.core.config import Settings
from app.core.exceptions import AppException, NotFoundError
from app.core.storage import ScreenshotStorage
from app.modules.auth.schemas import CurrentUser
from app.modules.boards.repository import BoardRepository
from app.modules.boards.schemas import BoardStatus
from app.modules.events.models import EventDocument
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.players.repository import PlayerRepository
from app.modules.players.schemas import RegistrationStatus
from app.modules.submissions.images import EXTENSIONS, validate_screenshot
from app.modules.submissions.models import SubmissionDocument
from app.modules.submissions.repository import SubmissionRepository, preverification_gate
from app.modules.submissions.schemas import (
    OwnSubmissionsResponse,
    ReviewCounts,
    ReviewItem,
    ReviewQueueQuery,
    ReviewQueueResponse,
    SubmissionCounts,
    SubmissionKind,
    SubmissionReject,
    SubmissionResponse,
    SubmissionStatus,
)
from app.modules.teams.repository import TeamRepository

SUBMISSION_QUANTITY = 1

EVENT_NOT_ACTIVE = "Submissions are only open while the event is active"
NOT_ELIGIBLE = "Only approved players with a team can submit"
POSITION_NOT_FOUND = "Board position not found"
DROP_NOT_ACCEPTED = "This item is not accepted by this card"
DROP_REQUIRED = "Choose the item you got"
PREVERIFICATION_REQUIRED = "Send this card's pre-verification first"
PREVERIFICATION_NOT_NEEDED = "This card doesn't require pre-verification"
PREVERIFICATION_EXISTS = "A pre-verification for this card is already pending or accepted"
PREVERIFICATION_NOT_ACCEPTED = "Accept this player's pre-verification for the card first"
ALREADY_REVIEWED = "Submission already reviewed"
REVIEW_CLOSED = "Submissions can only be reviewed for active or finished events"

REVIEWABLE_EVENT_STATUSES = {EventStatus.ACTIVE, EventStatus.FINISHED}
OPEN_PREVERIFICATION = {SubmissionStatus.PENDING, SubmissionStatus.ACCEPTED}


class SubmissionService:
    def __init__(
        self,
        submissions: SubmissionRepository,
        events: EventRepository,
        players: PlayerRepository,
        teams: TeamRepository,
        boards: BoardRepository,
        storage: ScreenshotStorage,
        settings: Settings,
    ) -> None:
        self._submissions = submissions
        self._events = events
        self._players = players
        self._teams = teams
        self._boards = boards
        self._storage = storage
        self._settings = settings

    async def submit(
        self,
        event_id: str,
        user: CurrentUser,
        kind: SubmissionKind,
        position: int,
        drop_key: str | None,
        note: str | None,
        screenshot: bytes,
    ) -> SubmissionResponse:
        event = await self._require_event(event_id)
        if event["status"] != EventStatus.ACTIVE:
            raise AppException(409, EVENT_NOT_ACTIVE)
        player = await self._players.get_for_user(event_id, user.id)
        if (
            player is None
            or player.get("status") != RegistrationStatus.APPROVED
            or player.get("team_id") is None
        ):
            raise AppException(403, NOT_ELIGIBLE)
        slot = await self._board_position(event_id, position)
        card: dict[str, Any] = slot["card"]
        requires = bool(card.get("requires_preverification", False))
        drop = self._choose_drop(card, kind, drop_key, requires)

        gate_status = None
        if requires:
            statuses = await self._submissions.preverification_statuses(
                event["_id"], {(player["_id"], position)}
            )
            gate_status = statuses.get((player["_id"], position))
        if kind == SubmissionKind.DROP and requires and gate_status not in OPEN_PREVERIFICATION:
            raise AppException(409, PREVERIFICATION_REQUIRED)
        if kind == SubmissionKind.PREVERIFICATION and gate_status in OPEN_PREVERIFICATION:
            raise AppException(409, PREVERIFICATION_EXISTS)

        content_type = validate_screenshot(screenshot, self._settings.max_screenshot_bytes)
        submission_id = ObjectId()
        key = f"events/{event_id}/submissions/{submission_id}.{EXTENSIONS[content_type]}"
        await self._storage.put(key, screenshot, content_type)

        team_id = player["team_id"]
        assert team_id is not None
        document: SubmissionDocument = {
            "_id": submission_id,
            "event_id": event["_id"],
            "team_id": team_id,
            "player_id": player["_id"],
            "user_id": ObjectId(user.id),
            "kind": kind,
            "status": SubmissionStatus.PENDING,
            "position": position,
            "row": slot["row"],
            "column": slot["column"],
            "card_id": card["card_id"],
            "card_revision": card["card_revision"],
            "card_name": card["name"],
            "requires_preverification": requires,
            "drop_key": drop["key"] if drop else None,
            "drop_name": drop["name"] if drop else None,
            "progress_weight": float(drop["progress_weight"]) if drop else None,
            "quantity": SUBMISSION_QUANTITY,
            "note": self._clean_note(note),
            "screenshot_key": key,
            "screenshot_type": content_type,
            "submitted_at": datetime.now(UTC),
        }
        if kind == SubmissionKind.PREVERIFICATION:
            document["preverification_note"] = card.get("rule_note")
            document["preverification_gate"] = preverification_gate(
                event["_id"], player["_id"], position
            )
        if not await self._submissions.insert(document):
            raise AppException(409, PREVERIFICATION_EXISTS)
        return self._response(document)

    async def own(self, event_id: str, user: CurrentUser) -> OwnSubmissionsResponse:
        event = await self._require_event(event_id)
        documents = await self._submissions.list_for_user(event["_id"], ObjectId(user.id))
        counts = SubmissionCounts(all=len(documents))
        for document in documents:
            setattr(counts, document["status"], getattr(counts, document["status"]) + 1)
        return OwnSubmissionsResponse(
            items=[self._response(document) for document in documents], counts=counts
        )

    async def queue(self, event_id: str, query: ReviewQueueQuery) -> ReviewQueueResponse:
        event = await self._require_event(event_id)
        documents, total = await self._submissions.page(
            event["_id"], query.status, query.kind, query.offset, query.limit
        )
        players = await self._players.get_many([document["player_id"] for document in documents])
        teams = {team["_id"]: team for team in await self._teams.list(event_id)}
        gated = {
            (document["player_id"], document["position"])
            for document in documents
            if document["kind"] == SubmissionKind.DROP and document["requires_preverification"]
        }
        gates = await self._submissions.preverification_statuses(event["_id"], gated)
        pending = await self._submissions.pending_counts(event["_id"])
        items = []
        for document in documents:
            player = players.get(document["player_id"])
            team = teams.get(document["team_id"])
            gate = (
                gates.get((document["player_id"], document["position"]))
                if document["kind"] == SubmissionKind.DROP
                else None
            )
            items.append(
                ReviewItem(
                    **self._response(document).model_dump(),
                    player_id=str(document["player_id"]),
                    player_name=player["display_name"] if player else "—",
                    team_id=str(document["team_id"]),
                    team_name=team["name"] if team else None,
                    team_color=team.get("color") if team else None,
                    requires_preverification=document["requires_preverification"],
                    preverification_status=SubmissionStatus(gate) if gate else None,
                    within_event=self._within_event(event, document["submitted_at"]),
                )
            )
        return ReviewQueueResponse(
            items=items,
            total=total,
            offset=query.offset,
            limit=query.limit,
            counts=ReviewCounts(
                pending=sum(pending.values()),
                pending_preverification=pending.get(SubmissionKind.PREVERIFICATION, 0),
                pending_drop=pending.get(SubmissionKind.DROP, 0),
            ),
        )

    async def accept(self, submission_id: str, admin: CurrentUser) -> SubmissionResponse:
        document = await self._require_reviewable(submission_id)
        if document["kind"] == SubmissionKind.DROP and document["requires_preverification"]:
            gates = await self._submissions.preverification_statuses(
                document["event_id"], {(document["player_id"], document["position"])}
            )
            gate = gates.get((document["player_id"], document["position"]))
            if gate != SubmissionStatus.ACCEPTED:
                raise AppException(409, PREVERIFICATION_NOT_ACCEPTED)
        return await self._decide(document, SubmissionStatus.ACCEPTED, admin)

    async def reject(
        self, submission_id: str, payload: SubmissionReject, admin: CurrentUser
    ) -> SubmissionResponse:
        document = await self._require_reviewable(submission_id)
        return await self._decide(
            document, SubmissionStatus.REJECTED, admin, payload.reason, payload.note
        )

    async def screenshot(
        self, submission_id: str, user: CurrentUser
    ) -> tuple[str | None, bytes | None, str]:
        """A signed URL, or the bytes to serve, plus the content type."""
        document = await self._submissions.get(submission_id)
        if document is None or (not user.is_admin and str(document["user_id"]) != user.id):
            raise NotFoundError("Submission")
        url = await self._storage.signed_url(document["screenshot_key"])
        if url is not None:
            return url, None, document["screenshot_type"]
        data = await self._storage.read(document["screenshot_key"])
        return None, data, document["screenshot_type"]

    async def _decide(
        self,
        document: SubmissionDocument,
        decision: SubmissionStatus,
        admin: CurrentUser,
        reason: str | None = None,
        note: str | None = None,
    ) -> SubmissionResponse:
        updated = await self._submissions.review(
            document["_id"], decision, admin.id, admin.username, reason, note
        )
        if updated is None:
            raise AppException(409, ALREADY_REVIEWED)
        return self._response(updated)

    async def _require_reviewable(self, submission_id: str) -> SubmissionDocument:
        document = await self._submissions.get(submission_id)
        if document is None:
            raise NotFoundError("Submission")
        if document["status"] != SubmissionStatus.PENDING:
            raise AppException(409, ALREADY_REVIEWED)
        event = await self._events.get(str(document["event_id"]))
        if event is None or event["status"] not in REVIEWABLE_EVENT_STATUSES:
            raise AppException(409, REVIEW_CLOSED)
        return document

    async def _require_event(self, event_id: str) -> EventDocument:
        event = await self._events.get(event_id)
        if event is None:
            raise NotFoundError("Event")
        return event

    async def _board_position(self, event_id: str, position: int) -> dict[str, Any]:
        board = await self._boards.get_by_event(event_id)
        if board is None or board["status"] != BoardStatus.PUBLISHED:
            raise AppException(404, POSITION_NOT_FOUND)
        slot = next((item for item in board["positions"] if item["position"] == position), None)
        if slot is None:
            raise AppException(404, POSITION_NOT_FOUND)
        return slot

    @staticmethod
    def _choose_drop(
        card: dict[str, Any], kind: SubmissionKind, drop_key: str | None, requires: bool
    ) -> dict[str, Any] | None:
        if kind == SubmissionKind.PREVERIFICATION:
            if not requires:
                raise AppException(422, PREVERIFICATION_NOT_NEEDED)
            return None
        if not drop_key:
            raise AppException(422, DROP_REQUIRED)
        drop = next((item for item in card["drops"] if item["key"] == drop_key), None)
        if drop is None:
            raise AppException(422, DROP_NOT_ACCEPTED)
        return dict(drop)

    @staticmethod
    def _clean_note(note: str | None) -> str | None:
        cleaned = " ".join((note or "").split())
        return cleaned or None

    @staticmethod
    def _within_event(event: EventDocument, submitted_at: datetime) -> bool:
        start, end = event["start_at"], event["end_at"]
        moment = submitted_at if submitted_at.tzinfo else submitted_at.replace(tzinfo=UTC)
        start = start if start.tzinfo else start.replace(tzinfo=UTC)
        end = end if end.tzinfo else end.replace(tzinfo=UTC)
        return start <= moment <= end

    @staticmethod
    def _response(document: SubmissionDocument) -> SubmissionResponse:
        return SubmissionResponse(
            id=str(document["_id"]),
            event_id=str(document["event_id"]),
            kind=SubmissionKind(document["kind"]),
            status=SubmissionStatus(document["status"]),
            position=document["position"],
            row=document["row"],
            column=document["column"],
            card_id=document["card_id"],
            card_revision=document["card_revision"],
            card_name=document["card_name"],
            drop_key=document["drop_key"],
            drop_name=document["drop_name"],
            progress_weight=document["progress_weight"],
            quantity=document["quantity"],
            note=document["note"],
            preverification_note=document.get("preverification_note"),
            submitted_at=document["submitted_at"],
            reviewed_at=document.get("reviewed_at"),
            reviewer_name=document.get("reviewer_name"),
            rejection_reason=document.get("rejection_reason"),
            rejection_note=document.get("rejection_note"),
        )
