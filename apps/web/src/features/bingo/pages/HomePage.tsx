import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { usePublicBoard } from '../../boards/hooks/useBoards'
import { useEvents } from '../../events/hooks/useEvents'
import type { BingoEvent } from '../../events/types'
import { DEFAULT_BOARD_SIZE } from '../../boards/draft'
import { boardToTiles, isFiltering, matchTile, tileListItemId } from '../boardTiles'
import { BingoBoard } from '../components/BingoBoard'
import { BoardToolbar, SearchField } from '../components/BoardToolbar'
import { EventHeader, MobileEventSummary } from '../components/EventHeader'
import { HelpDialog } from '../components/HelpDialog'
import { MiniMap } from '../components/MiniMap'
import { TileDetailPanel } from '../components/TileDetailPanel'
import { TileDetailsDialog } from '../components/TileDetailsDialog'
import { TileList } from '../components/TileList'
import { useBoardView } from '../hooks/useBoardView'
import { useFilterSummary, type FilterSummary } from '../hooks/useFilterSummary'
import { useTierOptions } from '../hooks/useTierOptions'
import type { TierFilter, Tile, TileMatch } from '../types'

interface BoardState {
  tiles: Tile[]
  /** Rows (and columns) of the published board. */
  size: number
  matches: Map<string, TileMatch> | null
  summary: FilterSummary | null
  search: string
  setSearch: (value: string) => void
  tier: TierFilter
  setTier: (tier: TierFilter) => void
  selected: Tile | null
  setSelectedId: (id: string | null) => void
}

/** Layout v2 board (docs/design/mockups/board-a-desktop and board-b-mobile). */
export function HomePage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const events = useEvents('active')
  const event = events.data?.find((candidate) => candidate.status === 'active') ?? null
  const board = usePublicBoard(event?.id ?? null)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<TierFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const tiles = useMemo(() => (board.data ? boardToTiles(board.data) : []), [board.data])
  const matches = useMemo(() => {
    if (!isFiltering(search, tier)) return null
    return new Map<string, TileMatch>(tiles.map((tile) => [tile.id, matchTile(tile, search, tier)]))
  }, [tiles, search, tier])
  const matchCount = matches ? [...matches.values()].filter((match) => match.matches).length : null
  const summary = useFilterSummary(matchCount, tiles.length, search, tier)
  const state: BoardState = {
    tiles,
    size: board.data?.size ?? DEFAULT_BOARD_SIZE,
    matches,
    summary,
    search,
    setSearch,
    tier,
    setTier,
    selected: tiles.find((tile) => tile.id === selectedId) ?? null,
    setSelectedId,
  }

  return (
    <AppShell desktopPadding="md:px-8 md:pt-7">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-3 md:gap-[18px]">
        {(events.isLoading || board.isLoading) && (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        )}
        {(events.isError || board.isError) && <p role="alert">{t('common.apiError')}</p>}
        {!events.isLoading && !event && <p className="text-rs-muted">{t('board.noActiveEvent')}</p>}
        {event && !board.isLoading && !board.data && (
          <p className="text-rs-muted">{t('board.unavailable')}</p>
        )}
        {event &&
          board.data &&
          (isDesktop ? (
            <DesktopBoard event={event} state={state} />
          ) : (
            <MobileBoard event={event} state={state} />
          ))}
      </div>
    </AppShell>
  )
}

function DesktopBoard({ event, state }: { event: BingoEvent; state: BoardState }) {
  const { t } = useTranslation()
  const [view, setView] = useBoardView()
  const [helpOpen, setHelpOpen] = useState(false)
  const select = (tile: Tile) => state.setSelectedId(tile.id)
  const selectedMatch = state.selected ? state.matches?.get(state.selected.id) : undefined

  return (
    <>
      <EventHeader event={event} />
      <InfoBanner>
        <strong>{t('board.progressNotice.title')}</strong> {t('board.progressNotice.body')}
      </InfoBanner>
      <BoardToolbar
        search={state.search}
        onSearchChange={state.setSearch}
        tier={state.tier}
        onTierChange={state.setTier}
        view={view}
        onViewChange={setView}
        onHelp={() => setHelpOpen(true)}
        summary={state.summary}
      />
      <div className="flex items-start gap-6">
        {view === 'grid' ? (
          <BingoBoard
            tiles={state.tiles}
            size={state.size}
            matches={state.matches}
            selectedId={state.selected?.id ?? null}
            onSelect={select}
          />
        ) : (
          <div className="min-w-0 flex-1">
            <TileList
              tiles={state.tiles}
              matches={state.matches}
              selectedId={state.selected?.id ?? null}
              onSelect={select}
            />
          </div>
        )}
        <TileDetailPanel
          tile={state.selected}
          match={selectedMatch}
          onClose={() => state.setSelectedId(null)}
        />
      </div>
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </>
  )
}

function MobileBoard({ event, state }: { event: BingoEvent; state: BoardState }) {
  const { t } = useTranslation()
  const tierOptions = useTierOptions()
  const [currentId, setCurrentId] = useState<string | null>(null)

  function jumpTo(tile: Tile) {
    setCurrentId(tile.id)
    document
      .getElementById(tileListItemId(tile))
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <MobileEventSummary event={event} />
      <SearchField value={state.search} onChange={state.setSearch} mobile />
      <SegmentedControl
        label={t('board.filter.label')}
        options={tierOptions}
        value={state.tier}
        onChange={state.setTier}
        variant="chip"
      />
      <p role="status" className="sr-only">
        {state.summary ? `${state.summary.matched} ${state.summary.rest}` : ''}
      </p>
      <MiniMap
        tiles={state.tiles}
        size={state.size}
        matches={state.matches}
        summary={state.summary}
        currentId={currentId}
        onJump={jumpTo}
      />
      <TileList
        tiles={state.tiles}
        matches={state.matches}
        onSelect={(tile) => state.setSelectedId(tile.id)}
      />
      {state.selected && (
        <TileDetailsDialog
          tile={state.selected}
          match={state.matches?.get(state.selected.id)}
          onClose={() => state.setSelectedId(null)}
        />
      )}
    </>
  )
}
