from typing import ClassVar

from motor.motor_asyncio import AsyncIOMotorDatabase


class IndexManager:
    """Manages MongoDB index definitions and their application at startup."""

    _definitions: ClassVar[list[tuple[str, list[tuple[str, int]], dict[str, object]]]] = []

    async def ensure_all(self, db: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        for collection, keys, options in self._definitions:
            await db[collection].create_index(keys, **options)  # type: ignore[arg-type]
