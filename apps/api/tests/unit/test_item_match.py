from app.modules.submissions.item_match import ItemMatch, match_item


def slot(position: int, name: str, drops: list[dict]) -> dict:
    return {"position": position, "card": {"name": name, "drops": drops}}


def test_matches_names_and_aliases_ignoring_case_accents_and_spacing() -> None:
    positions = [
        slot(2, "Corp", [{"key": "elysian", "name": "Elysian sigil", "aliases": ["Ely"]}]),
        slot(1, "Nex", [{"key": "hilt", "name": "Nihil horn"}, {"key": "x", "name": "Nihil Horn"}]),
    ]
    assert match_item(positions, "  ELY ") == [ItemMatch(2, "Corp", "elysian", "Elysian sigil")]
    # One match per square, board order.
    assert match_item(positions, "nihil horn") == [ItemMatch(1, "Nex", "hilt", "Nihil horn")]
    assert match_item(positions, "Twisted bow") == []
