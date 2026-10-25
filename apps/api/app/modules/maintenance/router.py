from fastapi import APIRouter, Response

from app.core.config import settings
from app.modules.maintenance.schemas import SiteStatus

router = APIRouter(tags=["infra"])


@router.get("/status", response_model=SiteStatus)
async def site_status(response: Response) -> SiteStatus:
    """Public: whether the site is in maintenance and the admins' message."""
    response.headers["Cache-Control"] = "no-store"
    return SiteStatus(maintenance=settings.maintenance_mode, message=settings.maintenance_message)
