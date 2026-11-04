from typing import Annotated

from fastapi import APIRouter, Query

from app.core.exceptions import AppException
from app.modules.audit.dependencies import AuditServiceDependency
from app.modules.audit.schemas import AuditPage, AuditQuery, BotAuditQuery
from app.modules.auth.dependencies import AdminDependency
from app.modules.bots.dependencies import BotCallerDependency

admin_router = APIRouter(prefix="/admin/audit", tags=["audit"])
bot_router = APIRouter(prefix="/bot/audit", tags=["audit"])


@admin_router.get("", response_model=AuditPage)
async def audit_log(
    admin: AdminDependency,
    service: AuditServiceDependency,
    query: Annotated[AuditQuery, Query()],
) -> AuditPage:
    return await service.page(query)


@bot_router.get("", response_model=AuditPage)
async def bot_audit_log(
    bot: BotCallerDependency,
    service: AuditServiceDependency,
    query: Annotated[BotAuditQuery, Query()],
) -> AuditPage:
    """Bot keys holding `audit:read` only (bot_gate checks the scope); never website users."""
    if bot is None:
        raise AppException(403, "Bot key required")
    return await service.poll(query)
