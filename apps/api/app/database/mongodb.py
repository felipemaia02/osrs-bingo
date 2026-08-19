from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import Settings


class DatabaseClient:
    """Async MongoDB client bound to a single database."""

    def __init__(self) -> None:
        self._motor_client: AsyncIOMotorClient | None = None  # type: ignore[type-arg]
        self._db_name: str = ""

    async def connect(self, settings: Settings) -> None:
        self._motor_client = AsyncIOMotorClient(settings.mongodb_url)
        self._db_name = settings.mongodb_database
        await self._motor_client.admin.command("ping")

    async def disconnect(self) -> None:
        if self._motor_client is not None:
            self._motor_client.close()
            self._motor_client = None

    @property
    def database(self) -> AsyncIOMotorDatabase:  # type: ignore[type-arg]
        if self._motor_client is None:
            raise RuntimeError("Database client not initialized")
        return self._motor_client[self._db_name]
