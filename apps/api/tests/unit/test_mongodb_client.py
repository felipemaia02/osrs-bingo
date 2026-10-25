from unittest.mock import AsyncMock, MagicMock, patch

from app.core.config import Settings
from app.database.mongodb import DatabaseClient


async def test_dates_come_back_timezone_aware() -> None:
    motor = MagicMock()
    motor.return_value.admin.command = AsyncMock()

    with patch("app.database.mongodb.AsyncIOMotorClient", motor):
        await DatabaseClient().connect(Settings())

    assert motor.call_args.kwargs["tz_aware"] is True
