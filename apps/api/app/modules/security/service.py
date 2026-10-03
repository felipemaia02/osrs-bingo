import hashlib
from datetime import UTC, datetime, timedelta

from pymongo.errors import PyMongoError

from app.core.exceptions import AppException
from app.modules.security.repository import RateLimitRepository

WINDOW_SECONDS = 60


class RequestLimiter:
    def __init__(self, repository: RateLimitRepository) -> None:
        self._repository = repository

    async def check(self, category: str, subject: str, limit: int) -> None:
        now = datetime.now(UTC)
        bucket = int(now.timestamp()) // WINDOW_SECONDS
        key = hashlib.sha256(f"{category}:{subject}:{bucket}".encode()).hexdigest()
        try:
            count = await self._repository.increment(
                key, now + timedelta(seconds=2 * WINDOW_SECONDS)
            )
        except (PyMongoError, RuntimeError) as exc:
            raise AppException(503, "Request validation unavailable") from exc
        if count > limit:
            retry_after = WINDOW_SECONDS - int(now.timestamp()) % WINDOW_SECONDS
            raise AppException(429, "Too many requests", headers={"Retry-After": str(retry_after)})
