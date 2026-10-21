import { useTranslation } from 'react-i18next'
import type { Tile, TileMatch } from '../types'
import { TileCard } from './TileCard'

const GRID_SIZE = 6
const GRID_POSITIONS = Array.from({ length: GRID_SIZE }, (_, index) => index + 1)

interface BingoBoardProps {
  tiles: Tile[]
  /** Per-tile match state while a search or filter is active; null when not filtering. */
  matches?: Map<string, TileMatch> | null
  onSelect?: (tile: Tile) => void
}

/** Compact 6×6 grid with row/column labels. Positions never move when filtering. */
export function BingoBoard({ tiles, matches = null, onSelect }: BingoBoardProps) {
  const { t } = useTranslation()
  const axisLabel = 'flex items-center justify-center text-[11px] font-semibold text-rs-muted'

  return (
    <div className="overflow-x-auto p-3 sm:p-4" tabIndex={0} aria-label={t('board.scrollRegion')}>
      <div className="grid min-w-[52rem] grid-cols-[1.25rem_repeat(6,minmax(0,1fr))] gap-2 lg:min-w-0">
        <span aria-hidden="true" />
        {GRID_POSITIONS.map((col) => (
          <span key={`col-${col}`} className={axisLabel} aria-hidden="true">
            {t('board.columnShort', { column: col })}
          </span>
        ))}
        {GRID_POSITIONS.map((row) => [
          <span key={`row-${row}`} className={axisLabel} aria-hidden="true">
            {t('board.rowShort', { row })}
          </span>,
          ...GRID_POSITIONS.map((col) => {
            const tile = tiles.find((item) => item.row === row && item.col === col)
            if (!tile) return <span key={`empty-${row}-${col}`} aria-hidden="true" />
            return (
              <TileCard
                key={tile.id}
                tile={tile}
                match={matches?.get(tile.id)}
                onSelect={onSelect}
              />
            )
          }),
        ])}
      </div>
    </div>
  )
}
