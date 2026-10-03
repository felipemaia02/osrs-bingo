from pathlib import Path

from pytest import MonkeyPatch

from app.core.config import Settings, environment_files


def test_cors_origins_accept_comma_separated_environment_value(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173, https://bingo.example.com")

    settings = Settings(_env_file=None)

    assert settings.cors_origins == ["http://localhost:5173", "https://bingo.example.com"]


def test_cors_origins_accept_json_environment_value(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", '["http://localhost:5173", "https://bingo.example.com"]')

    settings = Settings(_env_file=None)

    assert settings.cors_origins == ["http://localhost:5173", "https://bingo.example.com"]


def test_team_emblems_are_disabled_by_default() -> None:
    settings = Settings(_env_file=None)

    assert settings.team_emblems_enabled is False


def test_discord_admin_ids_are_explicit_and_secret_is_redacted(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_DISCORD_IDS", "123, 456")
    settings = Settings(_env_file=None, discord_client_secret="do-not-log")
    assert settings.admin_discord_ids == ["123", "456"]
    assert "do-not-log" not in repr(settings)


def test_api_startup_reads_root_credentials_with_local_and_process_overrides(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    api_directory = tmp_path / "apps" / "api"
    api_directory.mkdir(parents=True)
    monkeypatch.chdir(api_directory)
    monkeypatch.delenv("DISCORD_CLIENT_ID", raising=False)
    monkeypatch.delenv("DISCORD_CLIENT_SECRET", raising=False)
    (tmp_path / ".env").write_text(
        "DISCORD_CLIENT_ID=root-client\nDISCORD_CLIENT_SECRET=root-secret\n"
    )
    files = environment_files(api_directory / "app" / "core" / "config.py")

    root_settings = Settings(_env_file=files)
    assert root_settings.discord_client_id == "root-client"
    assert root_settings.discord_client_secret.get_secret_value() == "root-secret"

    (api_directory / ".env").write_text("DISCORD_CLIENT_ID=local-client\n")
    local_settings = Settings(_env_file=files)
    assert local_settings.discord_client_id == "local-client"
    assert local_settings.discord_client_secret.get_secret_value() == "root-secret"

    monkeypatch.setenv("DISCORD_CLIENT_ID", "process-client")
    assert Settings(_env_file=files).discord_client_id == "process-client"


def test_standalone_install_reads_only_working_directory_dotenv(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    directory = tmp_path / "standalone"
    directory.mkdir()
    monkeypatch.chdir(directory)
    monkeypatch.delenv("DISCORD_CLIENT_ID", raising=False)
    (tmp_path / ".env").write_text("DISCORD_CLIENT_ID=unrelated-parent\n")
    (directory / ".env").write_text("DISCORD_CLIENT_ID=standalone-client\n")

    files = environment_files(directory / "app" / "core" / "config.py")

    assert files == (Path(".env"),)
    assert Settings(_env_file=files).discord_client_id == "standalone-client"
