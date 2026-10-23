import { useTranslation } from 'react-i18next'
import { initialsOf } from '../../../lib/text/initials'
import { axisOf } from '../../boards/draft'
import { gridColumns } from '../../boards/gridStyle'
import type { FilterSummary } from '../hooks/useFilterSummary'
import type { Tile, TileMatch, TileTier } from '../types'

const AXIS_PX = 14
const LETTER_COLOR: Record<TileTier, string> = {
  Low: 'text-rs-success-text',
  Mid: 'text-rs-gold-bright',
  High: 'text-rs-danger-text',
}

interface MiniMapProps {
  tiles: Tile[]
  size: number
  matches: Map<string, TileMatch> | null
  summary: FilterSummary | null
  currentId: string | null
  onJump: (tile: Tile) => void
}

/** Mobile size×size overview (board-b-mobile): initials and difficulty letter per cell; tap to jump. */
export function MiniMap({ tiles, size, matches, summary, currentId, onJump }: MiniMapProps) {
  const { t } = useTranslation()
  const positions = axisOf(size)
  const grid = gridColumns(AXIS_PX, size)
  const axis = 'text-center text-[11px] font-semibold text-rs-muted'

  return (
    <section
      aria-label={t('board.miniMap.label')}
      className="flex flex-col gap-1.5 rounded border border-rs-border bg-rs-surface p-2.5"
    >
      <div className="flex items-baseline justify-between">
        <strong className="text-[13px]">{t('board.miniMap.title', { size })}</strong>
        {summary && <span className="text-xs">{summary.short}</span>}
      </div>
      <div className="grid gap-1" style={grid} aria-hidden="true">
        <span />
        {positions.map((col) => (
          <span key={col} className={axis}>
            {col}
          </span>
        ))}
      </div>
      {positions.map((row) => (
        <div key={row} className="grid gap-1" style={grid}>
          <span className={`${axis} self-center`} aria-hidden="true">
            {row}
          </span>
          {positions.map((col) => {
            const tile = tiles.find((item) => item.row === row && item.col === col)
            if (!tile) return <span key={col} aria-hidden="true" />
            const match = matches?.get(tile.id)
            const hit = match?.matches === true
            const dimmed = match !== undefined && !match.matches
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => onJump(tile)}
                aria-label={t('board.miniMap.cell', {
                  name: tile.name,
                  row: tile.row,
                  column: tile.col,
                  tier: t(`tile.tier.${tile.tier}`),
                })}
                aria-current={tile.id === currentId ? 'location' : undefined}
                className={`flex h-[46px] min-w-0 flex-col items-center justify-center rounded-[3px] border p-0 text-[11px] font-bold leading-[1.1] ${
                  hit
                    ? 'border-rs-gold-bright bg-rs-gold-bright text-rs-canvas'
                    : tile.progress?.complete
                      ? 'border-rs-success bg-rs-success-bg text-rs-success-text'
                      : 'border-rs-border bg-rs-surface text-rs-text'
                } ${dimmed ? 'opacity-35' : ''} ${
                  tile.id === currentId
                    ? 'outline outline-2 outline-offset-2 outline-rs-gold-bright'
                    : ''
                }`}
              >
                <span>{initialsOf(tile.name)}</span>
                <span
                  className={`text-[10px] font-semibold ${hit ? 'text-rs-canvas' : LETTER_COLOR[tile.tier]}`}
                >
                  {t(`tile.tierLetter.${tile.tier}`)}
                </span>
              </button>
            )
          })}
        </div>
      ))}
      <span className="text-[11px] text-rs-muted">{t('board.miniMap.legend')}</span>
    </section>
  )
}
