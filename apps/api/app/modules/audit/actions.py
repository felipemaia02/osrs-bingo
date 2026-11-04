"""Audit action codes (feature 059): "<group>.<what happened>"."""

from enum import StrEnum


class AuditGroup(StrEnum):
    EVENT = "event"
    REGISTRATION = "registration"
    TEAM = "team"
    BOARD = "board"
    CARD = "card"
    SUBMISSION = "submission"
    ADMIN = "admin"
    SETTINGS = "settings"
    PROFILE = "profile"
    ACTIVITY = "activity"


def group_of(action: str) -> str:
    return action.split(".", 1)[0]
