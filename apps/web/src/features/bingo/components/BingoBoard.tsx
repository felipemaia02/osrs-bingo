import { useTranslation } from 'react-i18next'
import type { Tile, TileMatch } from '../types'
import { TileCard } from './TileCard'

const GRID_POSITIONS = [1, 2, 3, 4, 5, 6]
const WIKI_URL = 'https://oldschool.runescape.wiki/'
const GRID_COLUMNS = 'grid grid-cols-[20px_repeat(6,minmax(0,1fr))] gap-2'

interface BingoBoardProps {
  tiles: Tile[]
  /** Per-tile match state while a search or filter is active; null when not filtering. */
  matches: Map<string, TileMatch> | null
  selectedId: string | null
  onSelect: (tile: Tile) => void
}

/** Labeled 6×6 grid (board-a-desktop). Positions never move when filtering. */
export function BingoBoard({ tiles, matches, selectedId, onSelect }: BingoBoardProps) {
  const { t } = useTranslation()
  const axis = 'text-center text-xs font-semibold text-rs-muted'
  return (
    <section aria-label={t('board.gridLabel')} className="flex min-w-0 flex-1 flex-col gap-2">
      <div className={GRID_COLUMNS} aria-hidden="true">
        <span />
        {GRID_POSITIONS.map((col) => (
          <span key={col} className={axis}>
            {col}
          </span>
        ))}
      </div>
      {GRID_POSITIONS.map((row) => (
        <div key={row} className={`${GRID_COLUMNS} items-stretch`}>
          <span className={`${axis} self-center`} aria-hidden="true">
            {row}
          </span>
          {GRID_POSITIONS.map((col) => {
            const tile = tiles.find((item) => item.row === row && item.col === col)
            if (!tile) return <span key={col} aria-hidden="true" />
            return (
              <TileCard
                key={tile.id}
                tile={tile}
                match={matches?.get(tile.id)}
                selected={tile.id === selectedId}
                onSelect={onSelect}
              />
            )
          })}
        </div>
      ))}
      <p className="m-0 ml-7 mt-1.5 text-xs text-rs-muted">
        {t('board.attribution.prefix')}{' '}
        <a
          href={WIKI_URL}
          target="_blank"
          rel="noreferrer"
          className="text-rs-gold-bright hover:text-rs-gold-hover"
        >
          OSRS Wiki
        </a>
        . {t('board.attribution.fallback')}
      </p>
    </section>
  )
}
