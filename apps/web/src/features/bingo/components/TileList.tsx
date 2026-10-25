import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { useTileLabel } from '../hooks/useTileLabel'
import { TIER_TONE } from '../tierTone'
import type { Tile, TileMatch } from '../types'
import { CardImage } from '../../../components/ui/CardImage'
import { TileProgressLine } from './TileProgressLine'

interface TileListProps {
  tiles: Tile[]
  matches: Map<string, TileMatch> | null
  selectedId?: string | null
  onSelect: (tile: Tile) => void
}

/** Row-grouped list (board-b-mobile); also the desktop list view. Never reorders tiles. */
export function TileList({ tiles, matches, selectedId = null, onSelect }: TileListProps) {
  const { t } = useTranslation()
  const gridTiles = tiles.filter((tile) => !tile.bonus)
  const rows = [...new Set(gridTiles.map((tile) => tile.row))].sort((a, b) => a - b)
  const groups = [
    ...rows.map((row) => ({
      key: `row-${row}`,
      title: t('board.row', { row }),
      tiles: gridTiles.filter((tile) => tile.row === row),
    })),
    // Bonus cards close the list in their own section (feature 020).
    ...(tiles.some((tile) => tile.bonus)
      ? [
          {
            key: 'bonus',
            title: t('board.bonus.section'),
            tiles: tiles.filter((tile) => tile.bonus),
          },
        ]
      : []),
  ]
  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ key, title, tiles: group }) => {
        const rowTiles = [...group].sort((a, b) => a.col - b.col)
        const hits = matches
          ? rowTiles.filter((tile) => matches.get(tile.id)?.matches).length
          : null
        return (
          <section key={key} aria-labelledby={`board-${key}`} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 rounded-[3px] border border-rs-border bg-rs-inset px-3 py-2">
              <h2 id={`board-${key}`} className="m-0 font-display text-[15px] text-rs-gold-bright">
                {title}
              </h2>
              {hits !== null && (
                <span className="text-xs text-rs-muted">
                  {hits > 0
                    ? t('board.rowSummary.some', { count: hits, total: rowTiles.length })
                    : t('board.rowSummary.none')}
                </span>
              )}
            </div>
            {rowTiles.map((tile) => (
              <TileRow
                key={tile.id}
                tile={tile}
                match={matches?.get(tile.id)}
                selected={tile.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}

interface TileRowProps {
  tile: Tile
  match?: TileMatch
  selected: boolean
  onSelect: (tile: Tile) => void
}

function TileRow({ tile, match, selected, onSelect }: TileRowProps) {
  const { t } = useTranslation()
  const label = useTileLabel(tile, match)
  const dimmed = match !== undefined && !match.matches
  const highlighted = match !== undefined && match.matches
  const hit = highlighted ? match.matchedDrop : null

  return (
    <button
      type="button"
      onClick={() => onSelect(tile)}
      aria-label={label}
      aria-pressed={selected}
      className={`flex min-h-[66px] w-full scroll-mt-24 items-center gap-3 rounded border bg-rs-surface px-2.5 py-2 text-left text-rs-text transition-opacity ${
        highlighted
          ? 'border-rs-gold-bright shadow-[inset_0_0_0_1px_theme(colors.rs.gold-bright)]'
          : 'border-rs-border'
      } ${dimmed ? 'opacity-[.38]' : ''} ${selected ? 'outline outline-2 outline-offset-2 outline-rs-gold-bright' : ''}`}
    >
      <span className="min-w-[30px] text-center text-[11px] font-semibold tabular-nums text-rs-muted">
        {tile.bonus ? `★${tile.col}` : t('board.columnShort', { column: tile.col })}
      </span>
      <CardImage name={tile.name} imageUrl={tile.imageUrl} className="h-12 w-[52px] shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="font-semibold">{tile.name}</span>
        <span className="flex items-center gap-1.5">
          <Badge tone={TIER_TONE[tile.tier]}>{t(`tile.tier.${tile.tier}`)}</Badge>
          <span className="text-xs text-rs-muted">
            {t('board.pointsAndRequirement', {
              points: tile.points,
              requirement: tile.requirement,
            })}
          </span>
        </span>
        {tile.progress && <TileProgressLine progress={tile.progress} />}
        {hit && (
          <span className="text-xs font-semibold text-rs-gold-bright">
            ↳ {hit.name} +{hit.progressWeight}
          </span>
        )}
      </span>
      <ChevronRightOutlinedIcon className="text-rs-muted" aria-hidden="true" />
    </button>
  )
}
