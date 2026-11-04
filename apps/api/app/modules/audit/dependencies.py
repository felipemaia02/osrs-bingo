from typing import Annotated

from fastapi import Depends, Request

from app.modules.audit.repository import AuditRepository
from app.modules.audit.schemas import AuditActor
from app.modules.audit.service import AuditService
from app.modules.auth.dependencies import CURRENT_USER_STATE
from app.modules.auth.schemas import CurrentUser
from app.modules.bots.dependencies import current_bot


def request_actor(request: Request) -> AuditActor | None:
    """The signed-in user, or the bot (and the Discord user it acts for)."""
    user: CurrentUser | None = getattr(request.state, CURRENT_USER_STATE, None)
    bot = current_bot(request)
    if bot is not None:
        return AuditActor(
            kind="bot",
            id=bot.key.id,
            name=bot.key.name,
            on_behalf_of=user.username if user else None,
        )
    if user is not None:
        return AuditActor(kind="user", id=user.id, name=user.username)
    return None


def get_audit_service(request: Request) -> AuditService:
    return AuditService(AuditRepository(request.app.state.db_client.database))


AuditServiceDependency = Annotated[AuditService, Depends(get_audit_service)]
