import json
from pathlib import Path
from typing import Annotated

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def environment_files(config_path: Path) -> tuple[Path, ...]:
    api_directory = config_path.resolve().parents[2]
    if api_directory.name == "api" and api_directory.parent.name == "apps":
        return (api_directory.parent.parent / ".env", Path(".env"))
    return (Path(".env"),)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=environment_files(Path(__file__)),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_database: str = "osrs_bingo"
    team_emblems_enabled: bool = False
    max_request_body_bytes: int = Field(default=65536, ge=1024)
    auth_requests_per_minute: int = Field(default=20, ge=1)
    mutation_requests_per_minute: int = Field(default=120, ge=1)
    discord_client_id: str = ""
    discord_client_secret: SecretStr = SecretStr("")
    discord_redirect_uri: str = "http://localhost:8000/auth/discord/callback"
    frontend_url: str = "http://localhost:5173"
    admin_discord_ids: Annotated[list[str], NoDecode] = []

    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    @field_validator("cors_origins", "admin_discord_ids", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if not isinstance(value, str):
            return value
        stripped = value.strip()
        if stripped.startswith("["):
            decoded = json.loads(stripped)
            if not isinstance(decoded, list) or not all(
                isinstance(origin, str) for origin in decoded
            ):
                raise ValueError("CORS_ORIGINS JSON value must be a list of strings")
            return [origin.strip() for origin in decoded if origin.strip()]
        return [origin.strip() for origin in stripped.split(",") if origin.strip()]


settings = Settings()
