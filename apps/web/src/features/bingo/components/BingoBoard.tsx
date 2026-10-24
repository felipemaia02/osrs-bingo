import { useTranslation } from 'react-i18next'
import { axisOf } from '../../boards/draft'
import { gridColumns, sameCellWidth } from '../../boards/gridStyle'
import type { Tile, TileMatch } from '../types'
import { TileCard } from './TileCard'

const WIKI_URL = 'https://oldschool.runescape.wiki/'
const AXIS_PX = 20
const GAP_PX = 8

interface BingoBoardProps {
  tiles: Tile[]
  /** Rows (and columns) of the published board. */
  size: number
  /** Per-tile match state while a search or filter is active; null when not filtering. */
  matches: Map<string, TileMatch> | null
  selectedId: string | null
  onSelect: (tile: Tile) => void
}

/** Labeled size×size grid (board-a-desktop). Positions never move when filtering. */
export function BingoBoard({ tiles, size, matches, selectedId, onSelect }: BingoBoardProps) {
  const { t } = useTranslation()
  const axis = 'text-center text-xs font-semibold text-rs-muted'
  const positions = axisOf(size)
  const grid = gridColumns(AXIS_PX, size)
  const bonusTiles = tiles.filter((tile) => tile.bonus).sort((a, b) => a.col - b.col)
  return (
    <section
      aria-label={t('board.gridLabel', { size })}
      className="flex min-w-0 flex-1 flex-col gap-2"
    >
      <div className="flex flex-col gap-2" style={sameCellWidth(AXIS_PX, GAP_PX, size)}>
        <div className="grid gap-2" style={grid} aria-hidden="true">
          <span />
          {positions.map((col) => (
            <span key={col} className={axis}>
              {col}
            </span>
          ))}
        </div>
        {positions.map((row) => (
          <div key={row} className="grid items-stretch gap-2" style={grid}>
            <span className={`${axis} self-center`} aria-hidden="true">
              {row}
            </span>
            {positions.map((col) => {
              const tile = tiles.find((item) => !item.bonus && item.row === row && item.col === col)
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
        {bonusTiles.length > 0 && (
          <>
            {/* Divider starts at the cards, not at the row-number column. */}
            <div
              aria-hidden="true"
              className="mt-2 mb-1 border-t border-dashed border-rs-gold/60"
              style={{ marginLeft: AXIS_PX + GAP_PX }}
            />
            <div
              role="group"
              aria-label={t('board.bonus.row')}
              className="grid items-stretch gap-2"
              style={grid}
            >
              <span className="self-center text-center text-sm text-rs-gold" aria-hidden="true">
                ★
              </span>
              {bonusTiles.map((tile) => (
                <TileCard
                  key={tile.id}
                  tile={tile}
                  match={matches?.get(tile.id)}
                  selected={tile.id === selectedId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </>
        )}
      </div>
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
