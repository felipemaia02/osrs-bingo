import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useSession } from '../../auth/hooks/useSession'
import { usePublicBoard } from '../../boards/hooks/useBoards'
import { useEvents } from '../../events/hooks/useEvents'
import type { BingoEvent } from '../../events/types'
import { DEFAULT_BOARD_SIZE } from '../../boards/draft'
import { boardToTiles, isFiltering, matchTile } from '../boardTiles'
import { BingoBoard } from '../components/BingoBoard'
import { BoardToolbar, MobileSearch } from '../components/BoardToolbar'
import { EventHeader, MobileEventSummary } from '../components/EventHeader'
import { HelpDialog } from '../components/HelpDialog'
import { MiniMap } from '../components/MiniMap'
import { MyEventsLanding } from '../components/MyEventsLanding'
import { TileDetailPanel } from '../components/TileDetailPanel'
import { MobileTileDetail } from '../components/MobileTileDetail'
import { TileList } from '../components/TileList'
import { useBoardView } from '../hooks/useBoardView'
import { useProgressReason } from '../hooks/useProgressReason'
import { useFilterSummary, type FilterSummary } from '../hooks/useFilterSummary'
import { useTierOptions } from '../hooks/useTierOptions'
import { TeamScorePanel } from '../../scoring/components/TeamScorePanel'
import { useOwnTeamScore } from '../../scoring/hooks/useScoring'
import { useOwnRegistration } from '../../teams/hooks/useTeams'
import type { TeamScore } from '../../scoring/types'
import type { TierFilter, Tile, TileMatch } from '../types'

interface BoardState {
  tiles: Tile[]
  rowBonus: number | null
  columnBonus: number | null
  /** The viewer's own team score; null for visitors and players without a team. */
  score: TeamScore | null
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
  const session = useSession()
  const ownScore = useOwnTeamScore(event?.id ?? null, Boolean(session.data))
  const score = ownScore.data ?? null
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<TierFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [browsing, setBrowsing] = useState(false)
  const registration = useOwnRegistration(event?.id ?? '', event ? session.data?.id : undefined)
  // Players in the active event land on its board; everyone else sees their events (026).
  const playing =
    registration.data?.status === 'pending' || registration.data?.status === 'approved'
  const deciding = session.isLoading || (Boolean(session.data) && registration.isLoading)

  const tiles = useMemo(
    () => (board.data ? boardToTiles(board.data, score) : []),
    [board.data, score],
  )
  const matches = useMemo(() => {
    if (!isFiltering(search, tier)) return null
    return new Map<string, TileMatch>(tiles.map((tile) => [tile.id, matchTile(tile, search, tier)]))
  }, [tiles, search, tier])
  const matchCount = matches ? [...matches.values()].filter((match) => match.matches).length : null
  const summary = useFilterSummary(matchCount, tiles.length, search, tier)
  const state: BoardState = {
    tiles,
    score,
    size: board.data?.size ?? DEFAULT_BOARD_SIZE,
    rowBonus: board.data?.row_bonus ?? null,
    columnBonus: board.data?.column_bonus ?? null,
    matches,
    summary,
    search,
    setSearch,
    tier,
    setTier,
    selected: tiles.find((tile) => tile.id === selectedId) ?? null,
    setSelectedId,
  }

  const boardView =
    event && !board.isLoading && !board.data ? (
      <p className="text-rs-muted">{t('board.unavailable')}</p>
    ) : event && board.data ? (
      isDesktop ? (
        <DesktopBoard event={event} state={state} />
      ) : (
        <MobileBoard event={event} state={state} />
      )
    ) : null

  return (
    <AppShell desktopPadding="md:px-8 md:pt-7">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-3 md:gap-[18px]">
        {(events.isLoading || board.isLoading) && (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        )}
        {(events.isError || board.isError) && <p role="alert">{t('common.apiError')}</p>}
        {!events.isLoading && !deciding && !playing ? (
          <MyEventsLanding
            activeEvent={event}
            browsing={browsing}
            onBrowse={() => setBrowsing(true)}
            board={boardView}
          />
        ) : (
          !deciding && (
            <>
              {!events.isLoading && !event && (
                <p className="text-rs-muted">{t('board.noActiveEvent')}</p>
              )}
              {boardView}
            </>
          )
        )}
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
  const reason = useProgressReason(event.id)

  return (
    <>
      <EventHeader event={event} />
      {state.score ? (
        <TeamScorePanel score={state.score} />
      ) : (
        <InfoBanner>
          <strong>{t('board.progressNotice.title')}</strong> {t(reason)}
        </InfoBanner>
      )}
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
          unavailableReason={reason}
          onClose={() => state.setSelectedId(null)}
        />
      </div>
      {helpOpen && (
        <HelpDialog
          size={state.size}
          rowBonus={state.rowBonus}
          columnBonus={state.columnBonus}
          rulesText={event.rules_text ?? null}
          addenda={event.rules_addenda}
          tileUpdates={state.tiles.flatMap((tile) =>
            tile.lastUpdate ? [{ name: tile.name, ...tile.lastUpdate }] : [],
          )}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </>
  )
}

function MobileBoard({ event, state }: { event: BingoEvent; state: BoardState }) {
  const { t } = useTranslation()
  const tierOptions = useTierOptions()
  const reason = useProgressReason(event.id)
  // Nothing is shown until a tile is tapped; tapping it again closes it (feature 025).
  const tile = state.selected
  const index = tile ? state.tiles.indexOf(tile) : -1
  const step = (offset: number) => {
    const next = state.tiles[index + offset]
    return next ? () => state.setSelectedId(next.id) : null
  }

  return (
    <>
      <MobileEventSummary
        event={event}
        hasScore={Boolean(state.score)}
        unavailableReason={reason}
      />
      {state.score && <TeamScorePanel score={state.score} compact />}
      <MobileSearch value={state.search} onChange={state.setSearch} />
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
        currentId={tile?.id ?? null}
        onSelect={(selected) => state.setSelectedId(selected.id === tile?.id ? null : selected.id)}
      />
      {tile ? (
        <MobileTileDetail
          tile={tile}
          match={state.matches?.get(tile.id)}
          unavailableReason={reason}
          onPrevious={step(-1)}
          onNext={step(1)}
          onClose={() => state.setSelectedId(null)}
        />
      ) : (
        <p className="m-0 rounded border border-dashed border-rs-border px-3 py-4 text-center text-[13px] text-rs-muted">
          {t('board.miniMap.hint')}
        </p>
      )}
    </>
  )
}
