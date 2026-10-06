from app.core.exceptions import ConflictError, NotFoundError
from app.modules.auth.schemas import CurrentUser
from app.modules.tiles.catalog import load_workbook_catalog
from app.modules.tiles.models import CardDocument
from app.modules.tiles.repository import CardRepository
from app.modules.tiles.schemas import (
    CardCreate,
    CardDetail,
    CardRetire,
    CardRevisionCreate,
    CardRevisionResponse,
    CardSummary,
    WorkbookImportResponse,
)

CARD_SLUG_CONFLICT = "Card slug already exists"
CARD_REVISION_CONFLICT = "Card changed while you were editing"


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

    async def retire(
        self, card_id: str, payload: CardRetire, actor: CurrentUser
    ) -> CardDetail:
        if await self._repository.get(card_id) is None:
            raise NotFoundError("Card")
        document = await self._repository.retire(card_id, payload, actor.id)
        if document is None:
            raise ConflictError(CARD_REVISION_CONFLICT)
        return self._detail(document)

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
