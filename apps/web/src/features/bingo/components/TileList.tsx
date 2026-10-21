import { useState } from 'react'
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import type { Tile, TileMatch } from '../types'
import { TIER_TONE } from '../tierTone'

const ROWS = [1, 2, 3, 4, 5, 6]

interface TileListProps {
  tiles: Tile[]
  matches?: Map<string, TileMatch> | null
  onSelect: (tile: Tile) => void
}

/** Row-grouped list for narrow screens: same tiles and order as the grid, no horizontal scroll. */
export function TileList({ tiles, matches = null, onSelect }: TileListProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 p-3 sm:p-4">
      {ROWS.map((row) => {
        const rowTiles = tiles.filter((tile) => tile.row === row).sort((a, b) => a.col - b.col)
        if (!rowTiles.length) return null
        return (
          <section key={row} aria-labelledby={`board-row-${row}`}>
            <h3
              id={`board-row-${row}`}
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-rs-muted"
            >
              {t('board.row', { row })}
            </h3>
            <ul className="space-y-1.5">
              {rowTiles.map((tile) => (
                <li key={tile.id}>
                  <TileRow tile={tile} match={matches?.get(tile.id)} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function TileRow({
  tile,
  match,
  onSelect,
}: {
  tile: Tile
  match?: TileMatch
  onSelect: (tile: Tile) => void
}) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const dimmed = match !== undefined && !match.matches
  const highlighted = match !== undefined && match.matches
  const matchLabel = highlighted
    ? match.matchedDrop
      ? t('board.match.drop', { drop: match.matchedDrop })
      : t('board.match.tile')
    : dimmed
      ? t('board.match.none')
      : null
  const baseLabel = t('tile.label', {
    row: tile.row,
    column: tile.col,
    name: tile.name,
    tier: t(`tile.tier.${tile.tier}`),
    points: tile.points,
    state: t('tile.progressUnavailable'),
  })

  return (
    <button
      type="button"
      onClick={() => onSelect(tile)}
      aria-label={matchLabel ? `${baseLabel}. ${matchLabel}` : baseLabel}
      className={`flex w-full items-center gap-3 rounded-sm border bg-rs-raised p-2 text-left transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-rs-gold ${
        highlighted ? 'border-rs-gold ring-1 ring-rs-gold' : 'border-rs-border/60'
      } ${dimmed ? 'opacity-35' : ''}`}
    >
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-rs-inset">
        {tile.imageUrl && !imageFailed ? (
          <img
            src={tile.imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="size-full object-contain p-1"
          />
        ) : (
          <ImageNotSupportedOutlinedIcon
            fontSize="small"
            className="text-rs-muted"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-rs-text">{tile.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-rs-muted">
          <Badge tone={TIER_TONE[tile.tier]}>{t(`tile.tier.${tile.tier}`)}</Badge>
          <span className="font-semibold text-rs-gold-bright">
            {t('tile.points', { count: tile.points })}
          </span>
          <span>{t('tile.requirementValue', { required: tile.requirement })}</span>
        </span>
        {highlighted && (
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-rs-gold-bright">
            {matchLabel}
          </span>
        )}
      </span>
    </button>
  )
}
