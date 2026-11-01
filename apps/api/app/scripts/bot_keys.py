"""Manage bot keys (feature 048).

    python -m app.scripts.bot_keys create <name> --scope events:read --scope score:read
    python -m app.scripts.bot_keys list
    python -m app.scripts.bot_keys revoke <name>

Uses MONGODB_URL / MONGODB_DATABASE, like the API.
"""

import argparse
import asyncio
import logging
import sys
from collections.abc import Sequence

from app.core.config import settings
from app.database.indexes import IndexManager
from app.database.mongodb import DatabaseClient
from app.modules.bots.repository import BotKeyRepository
from app.modules.bots.schemas import BotScope
from app.modules.bots.service import BotKeyService

FAILURE = 1


def parse_arguments(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="python -m app.scripts.bot_keys")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create", help="create a key and print it once")
    create.add_argument("name")
    create.add_argument(
        "--scope",
        dest="scopes",
        action="append",
        required=True,
        choices=[scope.value for scope in BotScope],
    )
    commands.add_parser("list", help="list keys (never shows the key)")
    revoke = commands.add_parser("revoke", help="revoke a key by name")
    revoke.add_argument("name")
    return parser.parse_args(argv)


async def run(arguments: argparse.Namespace, service: BotKeyService) -> int:
    if arguments.command == "create":
        try:
            key, plain = await service.create(
                arguments.name, {BotScope(scope) for scope in arguments.scopes}
            )
        except ValueError as error:
            print(error, file=sys.stderr)
            return FAILURE
        print(f"Created {key.name} ({', '.join(sorted(key.scopes))}).")
        print("Key (shown only now, store it in the bot's secrets):")
        print(plain)
    elif arguments.command == "list":
        for summary in await service.list():
            state = f"revoked {summary.revoked_at:%Y-%m-%d}" if summary.revoked_at else "active"
            used = f"{summary.last_used_at:%Y-%m-%d %H:%M}" if summary.last_used_at else "never"
            scopes = ", ".join(sorted(summary.scopes))
            print(f"{summary.name}\t{state}\tlast used {used}\t{scopes}")
    elif not await service.revoke(arguments.name):
        print(f"No active bot key named {arguments.name!r}", file=sys.stderr)
        return FAILURE
    else:
        print(f"Revoked {arguments.name}.")
    return 0


def quiet_app_logs() -> None:
    """The app logs to stdout; keep it to the command's own output."""
    for name in list(logging.root.manager.loggerDict):
        if name.startswith("app."):
            logging.getLogger(name).setLevel(logging.WARNING)


async def main(argv: Sequence[str] | None = None) -> int:
    arguments = parse_arguments(argv)
    quiet_app_logs()
    client = DatabaseClient()
    await client.connect(settings)
    try:
        await IndexManager().ensure_all(client.database)
        return await run(arguments, BotKeyService(BotKeyRepository(client.database)))
    finally:
        await client.disconnect()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
