from typing import Annotated

from fastapi import Depends, Request

from app.core.exceptions import AppException
from app.modules.bots.repository import BotKeyRepository
from app.modules.bots.schemas import BotCaller
from app.modules.bots.service import BotKeyService

BOT_CALLER_STATE = "bot_caller"


def get_bot_key_service(request: Request) -> BotKeyService:
    return BotKeyService(BotKeyRepository(request.app.state.db_client.database))


def current_bot(request: Request) -> BotCaller | None:
    """The bot behind this request, set by bot_gate; None for website users."""
    caller: BotCaller | None = getattr(request.state, BOT_CALLER_STATE, None)
    return caller


BotCallerDependency = Annotated[BotCaller | None, Depends(current_bot)]

BOT_KEY_REQUIRED = "Bot key required"


def require_bot(request: Request) -> BotCaller:
    """Bot-only routes (feature 072): website users get 403."""
    caller = current_bot(request)
    if caller is None:
        raise AppException(403, BOT_KEY_REQUIRED)
    return caller


RequiredBotDependency = Annotated[BotCaller, Depends(require_bot)]
