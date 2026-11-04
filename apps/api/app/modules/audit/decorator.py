"""`@audited(action)`: the one place that writes the audit log (feature 059).

Put it under the route decorator. After the handler succeeds it records who acted, the ids from
the URL, a label from the response and the request body, without secrets. Failures to record
are logged and never change the response."""

import inspect
from collections.abc import Awaitable, Callable
from functools import wraps
from typing import Any, ParamSpec, TypeVar

from fastapi import Request
from pydantic import BaseModel

from app.core.logging import get_logger, log_event
from app.modules.audit.actions import group_of
from app.modules.audit.dependencies import get_audit_service, request_actor
from app.modules.audit.schemas import AuditResource

P = ParamSpec("P")
R = TypeVar("R")

REQUEST_PARAMETER = "audit_request"
# Marks a handler as audited, so a test can find routes that change data without it.
ACTION_ATTRIBUTE = "audit_action"
LABEL_FIELDS = ("name", "display_name", "card_name", "team_name", "username")
# Never stored, whatever a body contains.
SECRET_FIELDS = frozenset({"key", "key_hash", "token", "password", "secret", "screenshot_url"})

logger = get_logger(__name__)


def audited(
    action: str, *, resource_id: str | None = None
) -> Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[R]]]:
    """`resource_id` names the path parameter holding the changed resource's id; without it the
    response's `id` is used."""

    def decorate(handler: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
        @wraps(handler)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            request = kwargs.pop(REQUEST_PARAMETER)
            result = await handler(*args, **kwargs)
            assert isinstance(request, Request)
            await _record(request, action, resource_id, kwargs, result)
            return result

        signature = inspect.signature(handler)
        request_parameter = inspect.Parameter(
            REQUEST_PARAMETER, inspect.Parameter.KEYWORD_ONLY, annotation=Request
        )
        wrapper.__signature__ = signature.replace(  # type: ignore[attr-defined]
            parameters=[*signature.parameters.values(), request_parameter]
        )
        setattr(wrapper, ACTION_ATTRIBUTE, action)
        return wrapper

    return decorate


async def _record(
    request: Request,
    action: str,
    resource_id: str | None,
    arguments: dict[str, Any],
    result: Any,
) -> None:
    try:
        actor = request_actor(request)
        if actor is None:
            return
        await get_audit_service(request).record(
            action,
            actor,
            AuditResource(
                type=group_of(action),
                id=_text(arguments.get(resource_id) if resource_id else _attribute(result, "id")),
                label=_label(result),
            ),
            event_id=_text(arguments.get("event_id") or _attribute(result, "event_id")),
            team_id=_text(arguments.get("team_id") or _attribute(result, "team_id")),
            payload=_payload(arguments),
        )
    except Exception as error:  # auditing must never fail the action
        log_event(logger, 40, "audit_record_failed", action=action, error=str(error))


def _attribute(result: Any, name: str) -> Any:
    return getattr(result, name, None)


def _text(value: Any) -> str | None:
    return str(value) if value is not None else None


def _label(result: Any) -> str | None:
    for field in LABEL_FIELDS:
        value = _attribute(result, field)
        if isinstance(value, str):
            return value
    revision = _attribute(result, "revision")  # cards keep their name on the revision
    name = _attribute(revision, "name")
    return name if isinstance(name, str) else None


def _payload(arguments: dict[str, Any]) -> dict[str, Any]:
    """Request bodies (Pydantic models) as JSON, minus secrets."""
    payload: dict[str, Any] = {}
    for value in arguments.values():
        if isinstance(value, BaseModel):
            body = value.model_dump(mode="json", exclude_none=True)
            payload.update({key: item for key, item in body.items() if key not in SECRET_FIELDS})
    return payload
