from typing import Annotated

from fastapi import Depends, Request

from app.core.config import settings
from app.modules.security.repository import RateLimitRepository
from app.modules.security.service import RequestLimiter


async def get_request_limiter(request: Request) -> RequestLimiter:
    return RequestLimiter(RateLimitRepository(request.app.state.db_client.database))


RequestLimiterDependency = Annotated[RequestLimiter, Depends(get_request_limiter)]


async def limit_authentication(request: Request, limiter: RequestLimiterDependency) -> None:
    peer = request.client.host if request.client else "unknown"
    await limiter.check("authentication", peer, settings.auth_requests_per_minute)
