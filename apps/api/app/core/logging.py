import logging
import sys
from typing import Any


class OAuthAccessLogFilter(logging.Filter):
    """Keep OAuth codes and state out of Uvicorn's default access log."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple) and len(record.args) == 5:
            client, method, target, version, status = record.args
            if isinstance(target, str) and target.split("?", 1)[0] == "/auth/discord/callback":
                record.args = (client, method, "/auth/discord/callback", version, status)
        return True


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")
        )
        logger.addHandler(handler)
        logger.propagate = False
    logger.setLevel(logging.INFO)
    return logger


def log_event(logger: logging.Logger, level: int, message: str, **context: Any) -> None:
    """Write a consistent application log without logging request payloads."""
    details = " ".join(f"{key}={value!r}" for key, value in context.items())
    logger.log(level, f"{message}{f' | {details}' if details else ''}")
