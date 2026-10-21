import { useMemo, useState } from 'react'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { Panel } from '../../../components/ui/Panel'
import { usePublicBoard } from '../../boards/hooks/useBoards'
import { useEvents } from '../../events/hooks/useEvents'
import { boardToTiles, isFiltering, matchTile } from '../boardTiles'
import { BingoBoard } from '../components/BingoBoard'
import { BoardToolbar } from '../components/BoardToolbar'
import { CompletionHelp } from '../components/CompletionHelp'
import { EventContext } from '../components/EventContext'
import { TileDetailsDialog } from '../components/TileDetailsDialog'
import { TileList } from '../components/TileList'
import { useBoardView } from '../hooks/useBoardView'
import type { TierFilter, Tile, TileMatch } from '../types'

export function HomePage() {
  const { t } = useTranslation()
  const events = useEvents('active')
  const event = events.data?.find((candidate) => candidate.status === 'active') ?? null
  const board = usePublicBoard(event?.id ?? null)
  const [view, setView] = useBoardView()
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<TierFilter>('all')
  const [selected, setSelected] = useState<Tile | null>(null)

  const tiles = useMemo(() => (board.data ? boardToTiles(board.data) : []), [board.data])
  const matches = useMemo(() => {
    if (!isFiltering(search, tier)) return null
    return new Map<string, TileMatch>(tiles.map((tile) => [tile.id, matchTile(tile, search, tier)]))
  }, [tiles, search, tier])
  const matchCount = matches ? [...matches.values()].filter((match) => match.matches).length : null

  return (
    <AppShell>
      <div className="mx-auto max-w-[96rem]">
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rs-gold">
            {t('board.eyebrow')}
          </p>
          <h1 className="font-display text-2xl font-bold text-rs-text sm:text-3xl">
            {t('board.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-rs-muted">
            {event ? t('board.eventDescription', { event: event.name }) : t('board.description')}
          </p>
        </div>
        {event && <EventContext event={event} />}
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
        {board.data && (
          <Panel
            as="section"
            aria-labelledby="board-grid-title"
            className="min-w-0 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4 border-b border-rs-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <GridViewOutlinedIcon
                  className="text-rs-gold"
                  fontSize="small"
                  aria-hidden="true"
                />
                <h2
                  id="board-grid-title"
                  className="font-display text-sm font-bold text-rs-gold-bright"
                >
                  {t('board.gridTitle')}
                </h2>
              </div>
              <span className="text-xs text-rs-muted">
                {t('board.tileCount', { count: tiles.length })}
              </span>
            </div>
            <BoardToolbar
              search={search}
              onSearchChange={setSearch}
              tier={tier}
              onTierChange={setTier}
              view={view}
              onViewChange={setView}
              matchCount={matchCount}
            />
            <CompletionHelp />
            {view === 'grid' ? (
              <BingoBoard tiles={tiles} matches={matches} onSelect={setSelected} />
            ) : (
              <TileList tiles={tiles} matches={matches} onSelect={setSelected} />
            )}
          </Panel>
        )}
      </div>
      {selected && <TileDetailsDialog tile={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  )
}
