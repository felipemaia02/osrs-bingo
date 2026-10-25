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

    # Screenshot storage: an S3-compatible bucket when every storage_* value is set
    # (Railway Storage Bucket in production), otherwise a local folder for development.
    storage_endpoint: str = ""
    storage_bucket: str = ""
    storage_access_key_id: str = ""
    storage_secret_access_key: SecretStr = SecretStr("")
    storage_region: str = "auto"
    storage_local_path: str = ".storage"
    max_screenshot_bytes: int = Field(default=5 * 1024 * 1024, ge=1024)
    screenshot_url_ttl_seconds: int = Field(default=300, ge=30, le=3600)

    # Wise Old Man (feature 021). An API key raises the limit from 20 to 100 requests/min.
    wom_base_url: str = "https://api.wiseoldman.net/v2"
    wom_api_key: SecretStr = SecretStr("")
    wom_user_agent: str = "osrs-bingo (Thunder Crabs clan bingo)"
    # DropTracker group export API (feature 029). The key is the group's export key.
    droptracker_base_url: str = "https://api.droptracker.io"
    droptracker_api_key: SecretStr = SecretStr("")
    droptracker_group_id: int = Field(default=126, ge=1)
    droptracker_ingest_enabled: bool = False
    droptracker_poll_seconds: int = Field(default=300, ge=30, le=86400)
    droptracker_retention_days: int = Field(default=30, ge=1, le=366)
    # Phase 2 (counting drops toward the bingo); phase 1 never reads it.
    droptracker_bingo_enabled: bool = False
    # Maintenance mode (feature 028): only admins can use the API while it's on.
    maintenance_mode: bool = False
    maintenance_message: str | None = Field(default=None, max_length=280)

    @field_validator("maintenance_message")
    @classmethod
    def blank_message_is_none(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None

    # Tracking a player WOM never saw makes it read the hiscores, which can take a while.
    wom_timeout_seconds: float = Field(default=20, gt=0, le=60)

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
