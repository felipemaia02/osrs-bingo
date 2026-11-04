"""Audit log (feature 059): store and read entries."""

from datetime import UTC, datetime, timedelta
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from app.core.exceptions import AppException
from app.modules.audit.actions import AuditGroup, group_of
from app.modules.audit.repository import AuditRepository, Position, build_filters
from app.modules.audit.schemas import (
    AuditActor,
    AuditEntry,
    AuditPage,
    AuditQuery,
    AuditResource,
    BotAuditQuery,
)

RETENTION = timedelta(days=365)
ACTIVITY_RETENTION = timedelta(days=30)
MILLISECONDS = 1000


def retention_for(action: str) -> timedelta:
    return ACTIVITY_RETENTION if group_of(action) == AuditGroup.ACTIVITY else RETENTION


def encode_cursor(at: datetime, entry_id: ObjectId) -> str:
    return f"{int(at.timestamp() * MILLISECONDS)}.{entry_id}"


def decode_cursor(cursor: str) -> Position:
    try:
        milliseconds, entry_id = cursor.split(".", 1)
        return datetime.fromtimestamp(int(milliseconds) / MILLISECONDS, UTC), ObjectId(entry_id)
    except (ValueError, InvalidId, OverflowError) as error:
        raise AppException(400, "Invalid cursor") from error


def _object_id(value: str | None) -> ObjectId | None:
    return ObjectId(value) if value and ObjectId.is_valid(value) else None


def _now() -> datetime:
    """MongoDB keeps milliseconds; truncating keeps cursors exact."""
    now = datetime.now(UTC)
    return now.replace(microsecond=now.microsecond // MILLISECONDS * MILLISECONDS)


class AuditService:
    def __init__(self, repository: AuditRepository) -> None:
        self._repository = repository

    async def record(
        self,
        action: str,
        actor: AuditActor,
        resource: AuditResource,
        *,
        event_id: str | None = None,
        team_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        at = _now()
        await self._repository.insert(
            {
                "_id": ObjectId(),
                "at": at,
                "expires_at": at + retention_for(action),
                "action": action,
                "actor": actor.model_dump(),
                "event_id": _object_id(event_id),
                "team_id": _object_id(team_id),
                "resource": resource.model_dump(),
                "payload": payload or {},
            }
        )

    async def page(self, query: AuditQuery) -> AuditPage:
        """Newest first; one extra entry tells whether there is a next page."""
        if query.event_id and _object_id(query.event_id) is None:
            raise AppException(400, "Invalid event id")
        filters = build_filters(
            _object_id(query.event_id), query.group, query.actor, query.since, query.until
        )
        cursor = decode_cursor(query.cursor) if query.cursor else None
        found = await self._repository.find(filters, cursor, query.limit + 1, newest_first=True)
        shown = found[: query.limit]
        more = len(found) > query.limit
        return AuditPage(
            items=[_entry(document) for document in shown],
            next_cursor=encode_cursor(shown[-1]["at"], shown[-1]["_id"]) if more else None,
        )

    async def poll(self, query: BotAuditQuery) -> AuditPage:
        """Oldest first after the bot's cursor, so each entry is posted once."""
        filters = build_filters(None, query.group, None, None, None)
        cursor = decode_cursor(query.after) if query.after else None
        found = await self._repository.find(filters, cursor, query.limit, newest_first=False)
        last = found[-1] if found else None
        return AuditPage(
            items=[_entry(document) for document in found],
            next_cursor=encode_cursor(last["at"], last["_id"]) if last else query.after,
        )


def _entry(document: dict[str, Any]) -> AuditEntry:
    return AuditEntry(
        id=str(document["_id"]),
        at=document["at"],
        action=document["action"],
        actor=AuditActor.model_validate(document["actor"]),
        event_id=str(document["event_id"]) if document.get("event_id") else None,
        team_id=str(document["team_id"]) if document.get("team_id") else None,
        resource=AuditResource.model_validate(document["resource"]),
        payload=document.get("payload") or {},
    )
