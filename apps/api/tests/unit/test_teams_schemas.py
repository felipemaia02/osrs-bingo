import pytest
from pydantic import ValidationError

from app.modules.teams.schemas import TeamCreate


def test_team_fields_normalize_name_color_and_emblem_url() -> None:
    team = TeamCreate(
        name="  Thunder   Crabs ",
        color="#a1b2c3",
        emblem_url=" https://cdn.example.com/emblem.png ",
    )

    assert team.name == "Thunder Crabs"
    assert team.color == "#A1B2C3"
    assert team.emblem_url == "https://cdn.example.com/emblem.png"


@pytest.mark.parametrize("emblem_url", ["ftp://example.com/emblem.png", "not-a-url"])
def test_team_rejects_unsupported_emblem_url(emblem_url: str) -> None:
    with pytest.raises(ValidationError, match="HTTP or HTTPS"):
        TeamCreate(name="Thunder Crabs", emblem_url=emblem_url)
