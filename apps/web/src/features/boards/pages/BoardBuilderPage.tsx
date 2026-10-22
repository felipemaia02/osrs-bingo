import { useMemo, useState, type ReactNode } from 'react'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useCards } from '../../cards/hooks/useCards'
import type { CardDifficulty } from '../../cards/types'
import { useEvents } from '../../events/hooks/useEvents'
import type { BingoEvent } from '../../events/types'
import { BoardSizeControl } from '../components/BoardSizeControl'
import { BuilderCatalog } from '../components/BuilderCatalog'
import { BuilderGrid } from '../components/BuilderGrid'
import { BuilderStatusPanel } from '../components/BuilderStatusPanel'
import { CardRulesSummary } from '../components/CardRulesSummary'
import { MobileFilledPosition, MobilePickCard } from '../components/MobileCardStep'
import { MobilePositionMap } from '../components/MobilePositionMap'
import { columnOf, emptyPositions, rowOf } from '../draft'
import { useAdminBoard, useSaveBoard } from '../hooks/useBoards'
import { useBoardDraft } from '../hooks/useBoardDraft'
import { useBuilderCards, type BuilderCard } from '../hooks/useBuilderCards'
import {
  filterCatalog,
  matchesCatalogSearch,
  type CatalogMode,
  type DifficultyFilter,
} from '../hooks/useCatalogFilter'
import type { DragSource } from '../types'

const SAVE_ERRORS: Record<string, string> = {
  'Board changed while you were editing': 'boards.errors.changed',
  'Retired cards cannot be selected': 'boards.errors.retired',
}

interface Feedback {
  message: string
  isError: boolean
}

interface PendingResize {
  size: number
  names: string[]
}

/** Layout v2 board builder (docs/design/mockups/boards-a-desktop and boards-b-mobile). */
export function BoardBuilderPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const events = useEvents()
  const [eventId, setEventId] = useState('')
  const event = events.data?.find((candidate) => candidate.id === eventId) ?? null

  const eventSelect = (
    <label className={`flex flex-col gap-1 ${isDesktop ? 'w-[360px]' : ''}`}>
      <span className="text-[13px] font-semibold">{t('boards.event')}</span>
      <span className="relative flex items-center">
        <select
          value={eventId}
          onChange={(change) => setEventId(change.target.value)}
          className="min-h-11 w-full appearance-none rounded-[3px] border border-rs-border bg-rs-inset pl-3 pr-9 text-base text-rs-text md:min-h-10 md:text-sm"
        >
          <option value="">{t('boards.selectEvent')}</option>
          {events.data?.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} · {t(`events.status.${candidate.status}`)}
            </option>
          ))}
        </select>
        <ExpandMoreOutlinedIcon
          className="pointer-events-none absolute right-2.5"
          aria-hidden="true"
        />
      </span>
    </label>
  )

  return (
    <AppShell desktopPadding="md:px-7 md:pt-6">
      <div className="flex flex-col gap-3 md:gap-3.5">
        {isDesktop ? (
          <div className="flex items-end justify-between gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[.18em] text-rs-gold">
                {t('admin.title')}
              </span>
              <h1 className="m-0 font-display text-[30px] font-bold leading-[1.15] text-rs-gold-bright">
                {t('boards.title')}
              </h1>
              <span className="text-rs-muted">{t('boards.description')}</span>
            </div>
            {eventSelect}
          </div>
        ) : (
          <>
            <Link
              to="/admin"
              className="inline-flex min-h-8 items-center gap-0.5 self-start text-[13px] text-rs-gold-bright"
            >
              <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              {t('admin.title')}
            </Link>
            {!event && (
              <>
                <MobileTitle event={null} badge={null} />
                {eventSelect}
              </>
            )}
          </>
        )}
        {events.isLoading && <p role="status">{t('common.loading')}</p>}
        {events.isError && <p role="alert">{t('common.apiError')}</p>}
        {!event ? (
          <p className="rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
            {t('boards.chooseEvent')}
          </p>
        ) : (
          <EventBoardBuilder
            key={event.id}
            event={event}
            desktop={isDesktop}
            eventSelect={eventSelect}
          />
        )}
      </div>
    </AppShell>
  )
}

function MobileTitle({ event, badge }: { event: BingoEvent | null; badge: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-end justify-between gap-2">
      <div>
        {event && (
          <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold">
            {event.name}
          </span>
        )}
        <h1 className="m-0 font-display text-[22px] font-bold leading-[1.15] text-rs-gold-bright">
          {t('boards.title')}
        </h1>
      </div>
      {badge}
    </div>
  )
}

function EventBoardBuilder({
  event,
  desktop,
  eventSelect,
}: {
  event: BingoEvent
  desktop: boolean
  /** Mobile: the selector sits between the title row and step 1. */
  eventSelect: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const cards = useCards(true)
  const board = useAdminBoard(event.id)
  const save = useSaveBoard()
  const draft = useBoardDraft(board.data, board.isFetched)
  const builder = useBuilderCards(board.data, cards.data ?? [])
  // Draft events are editable once loaded; actions pause while a save is in flight.
  const draftEvent = event.status === 'draft' && board.isFetched && !board.isError
  const editable = draftEvent && !save.isPending

  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragSource | null>(null)
  const [mode, setMode] = useState<CatalogMode>('available')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all')
  const [query, setQuery] = useState('')
  const [swapping, setSwapping] = useState(false)
  const [pendingResize, setPendingResize] = useState<PendingResize | null>(null)
  const positionLabel = (position: number) =>
    `${rowOf(position, draft.size)}·${columnOf(position, draft.size)}`

  const catalog = useMemo(
    () => filterCatalog(builder.catalogCards, draft.draft, { mode, difficulty, query }),
    [builder.catalogCards, draft.draft, mode, difficulty, query],
  )
  const placed = Object.values(draft.draft).map((key) => builder.cardFor(key))
  const filled = placed.length
  const tierCounts = placed.reduce<Record<CardDifficulty, number>>(
    (counts, card) =>
      card ? { ...counts, [card.difficulty]: counts[card.difficulty] + 1 } : counts,
    { Low: 0, Mid: 0, High: 0 },
  )
  const empty = emptyPositions(draft.draft, draft.size).length
  const fillCount = Math.min(empty, catalog.available.length)
  const rulesCard =
    builder.cardFor(selectedKey ?? undefined) ??
    (selectedPosition ? builder.cardFor(draft.draft[selectedPosition]) : null)

  function addCard(card: BuilderCard, position?: number) {
    const target =
      position ??
      (selectedPosition && !draft.draft[selectedPosition] ? selectedPosition : undefined)
    if (draft.place(card.key, target) !== null) {
      setFeedback(null)
      setSelectedPosition(null)
    }
  }

  function applyResize(size: number) {
    draft.resize(size)
    setSelectedPosition(null)
    setSwapping(false)
    setPendingResize(null)
  }

  /** Shrinking that drops cards asks first (FR-007); anything else applies at once. */
  function requestResize(size: number) {
    if (size === draft.size) return
    const removed = draft.cardsOutside(size)
    if (removed.length) {
      setPendingResize({
        size,
        names: removed.map((key) => builder.cardFor(key)?.name ?? key),
      })
      return
    }
    applyResize(size)
  }

  function dropOn(position: number) {
    if (drag?.kind === 'catalog' && !draft.draft[position]) {
      const card = builder.cardFor(drag.key)
      if (card) addCard(card, position)
    }
    if (drag?.kind === 'slot') draft.move(drag.position, position)
    setDrag(null)
  }

  async function saveBoard() {
    setFeedback(null)
    try {
      await save.mutateAsync({ eventId: event.id, payload: draft.payload() })
      setFeedback({ message: t('boards.feedback.saved'), isError: false })
    } catch (error) {
      const detail = error instanceof AxiosError ? error.response?.data?.detail : null
      const key = typeof detail === 'string' ? SAVE_ERRORS[detail] : undefined
      setFeedback({ message: t(key ?? 'common.apiError'), isError: true })
    }
  }

  // On mobile the title row and event selector come from this component (see MobileTitle).
  const mobileHeader = !desktop && (
    <>
      <MobileTitle
        event={event}
        badge={
          board.isFetched && !board.isError ? (
            <Badge tone="neutral">
              {t(draftEvent ? 'boards.mobile.badge' : 'boards.state.readOnly', {
                filled,
                total: draft.total,
              })}
            </Badge>
          ) : null
        }
      />
      {eventSelect}
      {board.isFetched && !board.isError && (
        <BoardSizeControl
          size={draft.size}
          editable={editable}
          onChange={requestResize}
          variant="chip"
        />
      )}
    </>
  )

  if (board.isLoading || cards.isLoading)
    return (
      <>
        {mobileHeader}
        <p role="status">{t('common.loading')}</p>
      </>
    )
  if (board.isError || cards.isError)
    return (
      <>
        {mobileHeader}
        <div role="alert">
          <p>{t('common.apiError')}</p>
          <Button onClick={() => void Promise.all([board.refetch(), cards.refetch()])}>
            {t('auth.retry')}
          </Button>
        </div>
      </>
    )

  const feedbackLine = feedback && (
    <p role={feedback.isError ? 'alert' : 'status'} className="m-0 text-sm">
      {feedback.message}
    </p>
  )
  const noCards = !builder.catalogCards.length && (
    <p className="m-0 text-sm text-rs-muted">
      {t('boards.noCards')}{' '}
      <Link className="text-rs-gold-bright underline" to="/admin/cards">
        {t('boards.manageCatalog')}
      </Link>
    </p>
  )
  const clearDialog = confirmClear && (
    <ConfirmDialog
      title={t('boards.clearTitle')}
      message={t('boards.clearConfirmation')}
      confirmLabel={t('boards.clear')}
      danger
      busy={false}
      onConfirm={() => {
        draft.clear()
        setConfirmClear(false)
      }}
      onClose={() => setConfirmClear(false)}
    />
  )
  const resizeDialog = pendingResize && (
    <ConfirmDialog
      title={t('boards.size.shrinkTitle', { size: pendingResize.size })}
      message={t('boards.size.shrinkConfirmation', {
        count: pendingResize.names.length,
        size: pendingResize.size,
        names: new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
          pendingResize.names,
        ),
      })}
      confirmLabel={t('boards.size.shrinkConfirm', { size: pendingResize.size })}
      danger
      busy={false}
      onConfirm={() => applyResize(pendingResize.size)}
      onClose={() => setPendingResize(null)}
    />
  )

  if (desktop) {
    return (
      <>
        <BuilderStatusPanel
          editable={draftEvent}
          size={draft.size}
          filled={filled}
          tierCounts={tierCounts}
          fillCount={fillCount}
          dirty={draft.dirty}
          saving={save.isPending}
          onResize={requestResize}
          onFill={() => draft.fill(catalog.available.map((card) => card.key))}
          onClear={() => setConfirmClear(true)}
          onSave={() => void saveBoard()}
        />
        {feedbackLine}
        {noCards}
        <div className="flex items-start gap-5">
          <BuilderGrid
            draft={draft.draft}
            size={draft.size}
            cardFor={builder.cardFor}
            editable={editable}
            selectedPosition={selectedPosition}
            drag={drag}
            onDragChange={setDrag}
            onSelectPosition={(position) => {
              setSelectedPosition(position)
              setSelectedKey(null)
            }}
            onRemove={draft.remove}
            onDrop={dropOn}
          />
          <aside className="flex w-[380px] shrink-0 flex-col gap-3">
            <BuilderCatalog
              activeCount={builder.catalogCards.filter((card) => !card.retired).length}
              retiredCount={builder.catalogCards.filter((card) => card.retired).length}
              availableCount={catalog.available.length}
              onBoardCount={catalog.onBoardCount}
              items={catalog.items}
              retired={catalog.retired}
              mode={mode}
              difficulty={difficulty}
              query={query}
              selectedKey={selectedKey}
              editable={editable}
              canAdd={empty > 0}
              drag={drag}
              onModeChange={setMode}
              onDifficultyChange={setDifficulty}
              onQueryChange={setQuery}
              onSelect={(card) => setSelectedKey(card.key)}
              onAdd={(card) => addCard(card)}
              onDragChange={setDrag}
            />
            {rulesCard && <CardRulesSummary card={rulesCard} />}
          </aside>
        </div>
        {clearDialog}
        {resizeDialog}
      </>
    )
  }

  const current = selectedPosition
  const currentCard = current ? builder.cardFor(draft.draft[current]) : null
  return (
    <>
      {mobileHeader}
      {feedbackLine}
      {noCards}
      <MobilePositionMap
        draft={draft.draft}
        size={draft.size}
        cardFor={builder.cardFor}
        current={current}
        editable={editable}
        onTap={(position) => {
          if (swapping && current !== null) {
            draft.move(current, position)
            setSwapping(false)
            setSelectedPosition(null)
            return
          }
          setSelectedPosition(position)
        }}
      />
      {editable && current !== null && currentCard && (
        <MobileFilledPosition
          positionLabel={positionLabel(current)}
          card={currentCard}
          swapping={swapping}
          onRemove={() => {
            draft.remove(current)
            setSelectedPosition(null)
          }}
          onSwap={() => setSwapping(true)}
          onCancelSwap={() => setSwapping(false)}
        />
      )}
      {editable && current !== null && !currentCard && (
        <MobilePickCard
          positionLabel={positionLabel(current)}
          cards={catalog.available.filter((card) => matchesCatalogSearch(card, query))}
          query={query}
          onQueryChange={setQuery}
          onPlace={(card) => addCard(card, current)}
        />
      )}
      {editable && draft.dirty && (
        <>
          <div className="h-16" aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-[68px] z-20 flex items-center gap-3 border-t border-rs-border bg-rs-inset px-4 py-2">
            <Badge tone="gold">{t('boards.unsaved')}</Badge>
            <Button
              variant="primary"
              className="flex-1"
              disabled={save.isPending}
              onClick={() => void saveBoard()}
            >
              <SaveOutlinedIcon fontSize="small" aria-hidden="true" />
              {t(save.isPending ? 'common.saving' : 'boards.save')}
            </Button>
          </div>
        </>
      )}
      {clearDialog}
      {resizeDialog}
    </>
  )
}
