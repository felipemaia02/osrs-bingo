import pytest
from pydantic import ValidationError

from app.modules.players.schemas import PlayerFields


def test_player_name_is_normalized() -> None:
    player = PlayerFields(display_name="  Thunder   Crab ")

    assert player.display_name == "Thunder Crab"


def test_player_name_cannot_be_blank() -> None:
    with pytest.raises(ValidationError, match="visible content"):
        PlayerFields(display_name="   ")
