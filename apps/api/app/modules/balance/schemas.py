import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

BOSS_KEY = re.compile(r"^[a-z0-9_]{1,60}$")
MAX_EXCLUDED = 100


class BossKcSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    excluded: list[str] = Field(default_factory=list, max_length=MAX_EXCLUDED)

    @field_validator("excluded")
    @classmethod
    def boss_keys(cls, values: list[str]) -> list[str]:
        if any(not BOSS_KEY.fullmatch(value) for value in values):
            raise ValueError("Use Wise Old Man boss names")
        return sorted(set(values))


class BossKcSettings(BaseModel):
    """Bosses left out of boss KC totals, raids shown apart (feature 039)."""

    excluded: list[str]
    raids: list[str]
    known: list[str]
