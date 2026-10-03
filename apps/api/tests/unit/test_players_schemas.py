import pytest
from pydantic import ValidationError

from app.modules.players.schemas import PlayerCreate


def test_player_name_is_normalized() -> None:
    player = PlayerCreate(display_name="  Thunder   Crab ")

    assert player.display_name == "Thunder Crab"


def test_player_name_cannot_be_blank() -> None:
    with pytest.raises(ValidationError, match="visible content"):
        PlayerCreate(display_name="   ")


def test_registration_cannot_assign_a_team_implicitly() -> None:
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        PlayerCreate.model_validate(
            {"display_name": "Thunder Crab", "team_id": "66d000000000000000000001"}
        )
