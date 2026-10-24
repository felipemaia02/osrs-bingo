"""Background loop that keeps pulling the clan's drops while ingestion is enabled."""

import asyncio
import contextlib
from datetime import timedelta
from uuid import uuid4

from app.core.config import Settings
from app.core.logging import get_logger, log_event
from app.modules.droptracker.client import DropTrackerError
from app.modules.droptracker.repository import DropRepository
from app.modules.droptracker.service import DropTrackerService

logger = get_logger(__name__)
LEASE_FACTOR = 2


class DropTrackerPoller:
    def __init__(self, service: DropTrackerService, drops: DropRepository, settings: Settings):
        self._service = service
        self._drops = drops
        self._interval = settings.droptracker_poll_seconds
        self._owner = uuid4().hex
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._run(), name="droptracker-poller")
        log_event(logger, 20, "droptracker_poller_started", interval=self._interval)

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        log_event(logger, 20, "droptracker_poller_stopped")

    async def _run(self) -> None:
        while True:
            wait = self._interval
            try:
                lease = timedelta(seconds=self._interval * LEASE_FACTOR)
                if await self._drops.acquire_lease(self._owner, lease):
                    added = await self._service.poll_once()
                    log_event(logger, 20, "droptracker_poll_succeeded", added=added)
            except DropTrackerError as exc:
                # The message never contains the key (it travels only in a header).
                log_event(logger, 30, "droptracker_poll_failed", status=exc.status, error=str(exc))
                wait = max(wait, exc.retry_after or 0)
            except Exception as exc:  # keep polling whatever happens; the API must not crash
                log_event(logger, 40, "droptracker_poll_crashed", error=type(exc).__name__)
            await asyncio.sleep(wait)
