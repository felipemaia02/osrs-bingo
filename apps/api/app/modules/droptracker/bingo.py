"""Phase 2 of the DropTracker integration (feature 030): drops into the review queue.

Every automatic drop starts Pending; admins accept or reject it like a manual one.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId

from app.modules.boards.repository import BoardRepository
from app.modules.boards.schemas import BoardStatus
from app.modules.droptracker.repository import DropRepository
from app.modules.events.models import EventDocument
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import EventStatus
from app.modules.items.names import normalize_name
from app.modules.players.models import PlayerDocument
from app.modules.players.repository import PlayerRepository
from app.modules.profiles.schemas import normalize_rsn
from app.modules.submissions.models import SubmissionDocument
from app.modules.submissions.repository import SubmissionRepository
from app.modules.submissions.schemas import SubmissionKind, SubmissionSource, SubmissionStatus

BATCH_SIZE = 1000
SCREENSHOT_TYPE = "image/png"
SUBMISSION_QUANTITY = 1


class Outcome:
    CREATED = "created"
    NOT_IN_EVENT = "not_in_event"
    NO_CARD = "no_card"
    # Older runs (030) skipped drops sent manually; kept so their stored outcome still reads.
    MANUAL_DUPLICATE = "manual_duplicate"
    # Received before the player was placed in their team (late join, feature 037).
    BEFORE_TEAM = "before_team"
    # The same DropTracker drop was already a submission (unique drop ID).
    ALREADY_IMPORTED = "already_imported"
    OUTSIDE_WINDOW = "outside_window"


@dataclass(frozen=True)
class CardMatch:
    slot: dict[str, Any]
    drop: dict[str, Any]


class CardIndex:
    """The board's accepted drops by item ID and by name (030, IDs since 033).

    A card drop linked to OSRS items matches their IDs; it also matches by name when it accepts
    any version of the item (that covers noted drops, which have their own ID). Free-text drops
    match by name or alias only.
    """

    def __init__(self, positions: list[dict[str, Any]]) -> None:
        self._by_id: dict[int, list[CardMatch]] = {}
        self._by_name: dict[str, list[CardMatch]] = {}
        for slot in positions:
            for drop in slot["card"].get("drops", []):
                match = CardMatch(slot, drop)
                item_ids = drop.get("item_ids") or []
                for item_id in item_ids:
                    self._by_id.setdefault(int(item_id), []).append(match)
                if item_ids and not drop.get("match_by_name", True):
                    continue
                for name in {drop["name"], *drop.get("aliases", [])}:
                    self._by_name.setdefault(normalize_name(name), []).append(match)

    def lookup(self, drop: dict[str, Any]) -> list[CardMatch]:
        item_id = drop.get("item_id")
        found = [
            *(self._by_id.get(int(item_id), []) if item_id is not None else []),
            *self._by_name.get(normalize_name(drop.get("item_name")), []),
        ]
        unique: dict[tuple[int, str], CardMatch] = {}
        for match in found:
            unique.setdefault((match.slot["position"], match.drop["key"]), match)
        return list(unique.values())


class DropTrackerBingo:
    def __init__(
        self,
        drops: DropRepository,
        events: EventRepository,
        players: PlayerRepository,
        boards: BoardRepository,
        submissions: SubmissionRepository,
    ) -> None:
        self._drops = drops
        self._events = events
        self._players = players
        self._boards = boards
        self._submissions = submissions

    async def process(self) -> dict[str, int]:
        """Processes unseen drops for the active event; returns outcome counts."""
        active = await self._events.list(EventStatus.ACTIVE)
        if not active:
            return {}  # drops wait until an event is active
        event = active[0]
        event_id = str(event["_id"])
        board = await self._boards.get_by_event(event_id)
        if board is None or board["status"] != BoardStatus.PUBLISHED:
            return {}
        players = {
            normalize_rsn(player["display_name"]): player
            for player in await self._players.approved_with_team(event_id)
        }
        cards = self._card_index(board["positions"])
        counts: dict[str, int] = {}
        for drop in await self._drops.unprocessed(BATCH_SIZE):
            outcome = await self._process(drop, event, players, cards)
            counts[outcome] = counts.get(outcome, 0) + 1
            await self._drops.mark(drop["drop_id"], outcome, event["_id"])
        return counts

    async def _process(
        self,
        drop: dict[str, Any],
        event: EventDocument,
        players: dict[str, PlayerDocument],
        cards: "CardIndex",
    ) -> str:
        received = self._utc(drop["received_at"])
        if not self._utc(event["start_at"]) <= received <= self._utc(event["end_at"]):
            return Outcome.OUTSIDE_WINDOW
        player = players.get(normalize_rsn(drop["player_name"]))
        if player is None:
            return Outcome.NOT_IN_EVENT
        joined = player.get("team_assigned_at")
        if joined is not None and received < self._utc(joined):
            return Outcome.BEFORE_TEAM
        matches = self._choose(cards.lookup(drop), drop)
        if not matches:
            return Outcome.NO_CARD
        # Manual submissions never cancel automatic drops (035): reviewers see likely
        # duplicates flagged in the review queue instead.
        created = 0
        for match in matches:
            others = [item.slot["card"]["name"] for item in matches if item is not match]
            document = self._submission(drop, event, player, match, others, received)
            created += int(await self._submissions.insert(document))
        return Outcome.CREATED if created else Outcome.ALREADY_IMPORTED

    @staticmethod
    def _card_index(positions: list[dict[str, Any]]) -> "CardIndex":
        return CardIndex(positions)

    @staticmethod
    def _choose(matches: list[CardMatch], drop: dict[str, Any]) -> list[CardMatch]:
        """Several cards: the one named like the drop's NPC wins; otherwise all of them."""
        if len(matches) <= 1:
            return matches
        npc = normalize_name(drop.get("npc_name"))
        named = [
            match
            for match in matches
            if npc
            and (
                normalize_name(match.slot["card"]["name"]) in npc
                or npc in normalize_name(match.slot["card"]["name"])
            )
        ]
        return named if len(named) == 1 else matches

    @staticmethod
    def _submission(
        drop: dict[str, Any],
        event: EventDocument,
        player: PlayerDocument,
        match: CardMatch,
        others: list[str],
        received: datetime,
    ) -> SubmissionDocument:
        card = match.slot["card"]
        note = (
            f"Automatic · {drop.get('npc_name') or '?'} · x{drop.get('quantity') or 1}"
            f" · {received:%Y-%m-%d %H:%M} UTC"
        )
        if others:
            note += f" · Also matches: {', '.join(others)}"
        team_id = player["team_id"]
        assert team_id is not None
        return {
            "_id": ObjectId(),
            "event_id": event["_id"],
            "team_id": team_id,
            "player_id": player["_id"],
            "user_id": player["user_id"],
            "kind": SubmissionKind.DROP,
            "status": SubmissionStatus.PENDING,
            "position": match.slot["position"],
            "row": match.slot["row"],
            "column": match.slot["column"],
            "card_id": card["card_id"],
            "card_revision": card["card_revision"],
            "card_name": card["name"],
            "requires_preverification": bool(card.get("requires_preverification", False)),
            "drop_key": match.drop["key"],
            "drop_name": match.drop["name"],
            "progress_weight": float(match.drop["progress_weight"]),
            "quantity": SUBMISSION_QUANTITY,
            "note": note,
            "screenshot_key": "",
            "screenshot_type": SCREENSHOT_TYPE,
            "screenshot_url": drop.get("image_url"),
            "source": SubmissionSource.DROPTRACKER,
            "droptracker_drop_id": int(drop["drop_id"]),
            # Queued at the DropTracker time, so the review shows when it happened.
            "submitted_at": received,
        }

    @staticmethod
    def _utc(moment: datetime) -> datetime:
        return moment if moment.tzinfo else moment.replace(tzinfo=UTC)
