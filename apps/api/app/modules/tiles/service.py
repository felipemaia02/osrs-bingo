from typing import Any

from pydantic import ValidationError

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.auth.schemas import CurrentUser
from app.modules.items.names import normalize_name
from app.modules.items.service import ItemService
from app.modules.tiles.catalog import load_workbook_catalog
from app.modules.tiles.models import CardDocument
from app.modules.tiles.repository import CardRepository
from app.modules.tiles.schemas import (
    CardCreate,
    CardDetail,
    CardRetire,
    CardRevisionCreate,
    CardRevisionFields,
    CardRevisionResponse,
    CardSummary,
    LinkItemsResponse,
    WorkbookImportResponse,
)

CARD_SLUG_CONFLICT = "Card slug already exists"
CARD_REVISION_CONFLICT = "Card changed while you were editing"
LINK_ITEMS_REASON = "Linked drops to OSRS items"


class CardService:
    def __init__(self, repository: CardRepository) -> None:
        self._repository = repository

    async def create(self, payload: CardCreate, actor: CurrentUser) -> CardDetail:
        document = await self._repository.create(payload, actor.id)
        if document is None:
            raise ConflictError(CARD_SLUG_CONFLICT)
        return self._detail(document)

    async def list(self, include_retired: bool = False) -> list[CardSummary]:
        documents = await self._repository.list_cards(include_retired)
        return [self._summary(document) for document in documents]

    async def get(self, card_id: str) -> CardDetail:
        document = await self._repository.get(card_id)
        if document is None:
            raise NotFoundError("Card")
        return self._detail(document)

    async def add_revision(
        self, card_id: str, payload: CardRevisionCreate, actor: CurrentUser
    ) -> CardDetail:
        if await self._repository.get(card_id) is None:
            raise NotFoundError("Card")
        document = await self._repository.add_revision(card_id, payload, actor.id)
        if document is None:
            raise ConflictError(CARD_REVISION_CONFLICT)
        return self._detail(document)

    async def retire(self, card_id: str, payload: CardRetire, actor: CurrentUser) -> CardDetail:
        if await self._repository.get(card_id) is None:
            raise NotFoundError("Card")
        document = await self._repository.retire(card_id, payload, actor.id)
        if document is None:
            raise ConflictError(CARD_REVISION_CONFLICT)
        return self._detail(document)

    async def link_items(self, actor: CurrentUser, items: ItemService) -> LinkItemsResponse:
        """Links unlinked drops to OSRS items; each changed card gets a new revision, so boards
        that already exist keep their snapshot.

        Cards imported from the workbook take the bundled links first (same slug and drop key):
        they also fix workbook typos and link group drops ("Ahrim's Piece (any)"). Other drops
        link when their name is exactly an OSRS item (any version).
        """
        workbook = _workbook_links()
        cards = await self.list()
        names = [drop.name for card in cards for drop in card.revision.drops if not drop.item_ids]
        ids = await items.ids_by_name(names)
        linked_cards = linked_drops = unlinked = 0
        skipped: list[str] = []
        for card in cards:
            fields = card.revision.model_dump(include=set(CardRevisionFields.model_fields))
            changed = 0
            for drop in fields["drops"]:
                if drop["item_ids"]:
                    continue
                bundled = workbook.get((card.slug, drop["key"]))
                if bundled:
                    drop.update(
                        name=bundled["name"],
                        item_ids=bundled["item_ids"],
                        match_by_name=bundled["match_by_name"],
                    )
                    changed += 1
                    continue
                found = ids.get(normalize_name(drop["name"]))
                if found:
                    drop.update(item_ids=found, match_by_name=True)
                    changed += 1
                else:
                    unlinked += 1
            if not changed:
                continue
            try:
                payload = CardRevisionCreate(
                    **fields,
                    expected_revision=card.current_revision,
                    change_reason=LINK_ITEMS_REASON,
                )
            except ValidationError:
                skipped.append(card.revision.name)
                continue
            if await self._repository.add_revision(card.id, payload, actor.id) is None:
                skipped.append(card.revision.name)
                continue
            linked_cards += 1
            linked_drops += changed
        return LinkItemsResponse(
            linked_cards=linked_cards,
            linked_drops=linked_drops,
            unlinked_drops=unlinked,
            skipped_cards=skipped,
        )

    async def import_workbook(self, actor: CurrentUser) -> WorkbookImportResponse:
        catalog = load_workbook_catalog()
        imported, existing, conflicts = await self._repository.import_workbook(catalog, actor.id)
        source = catalog["source"]
        return WorkbookImportResponse(
            source_sha256=source["sha256"],
            expected_cards=36,
            expected_drops=213,
            source_bonus_entries=source["source_bonus_count"],
            resolved_bonus_entries=source["resolved_bonus_count"],
            imported_cards=imported,
            existing_cards=existing,
            conflicting_slugs=conflicts,
            usable=not conflicts and imported + existing == 36,
        )

    @classmethod
    def _summary(cls, document: CardDocument) -> CardSummary:
        revision = cls._current_revision(document)
        return CardSummary(
            id=str(document["_id"]),
            slug=document["slug"],
            status=document["status"],
            current_revision=document["current_revision"],
            revision=revision,
            created_at=document["created_at"],
            updated_at=document["updated_at"],
        )

    @classmethod
    def _detail(cls, document: CardDocument) -> CardDetail:
        summary = cls._summary(document)
        return CardDetail(
            **summary.model_dump(),
            revisions=[CardRevisionResponse.model_validate(item) for item in document["revisions"]],
            retired_by=document.get("retired_by"),
            retired_at=document.get("retired_at"),
            retirement_reason=document.get("retirement_reason"),
        )

    @staticmethod
    def _current_revision(document: CardDocument) -> CardRevisionResponse:
        revision = next(
            item
            for item in document["revisions"]
            if item["revision"] == document["current_revision"]
        )
        return CardRevisionResponse.model_validate(revision)


def _workbook_links() -> dict[tuple[str, str], dict[str, Any]]:
    """Bundled workbook drops that carry OSRS item IDs, by card slug and drop key (033)."""
    return {
        (card["slug"], drop["key"]): drop
        for card in load_workbook_catalog()["cards"]
        for drop in card["drops"]
        if drop.get("item_ids")
    }
