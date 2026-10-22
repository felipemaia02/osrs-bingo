import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { useTileLabel } from '../hooks/useTileLabel'
import { TIER_TONE } from '../tierTone'
import type { Tile, TileMatch } from '../types'
import { CardImage } from '../../../components/ui/CardImage'

interface TileCardProps {
  tile: Tile
  /** Present while a search or difficulty filter is active. */
  match?: TileMatch
  selected: boolean
  onSelect: (tile: Tile) => void
}

/** Compact grid tile (board-a-desktop `.tile`). Filtering dims or highlights it in place. */
export function TileCard({ tile, match, selected, onSelect }: TileCardProps) {
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
      className={`relative flex min-h-[138px] min-w-0 flex-col gap-1.5 rounded border bg-rs-surface p-[7px] text-left text-rs-text transition-opacity ${
        highlighted
          ? 'border-rs-gold-bright shadow-[inset_0_0_0_1px_theme(colors.rs.gold-bright)]'
          : 'border-rs-border'
      } ${dimmed ? 'opacity-[.38]' : ''} ${selected ? 'outline outline-2 outline-offset-[3px] outline-rs-gold-bright' : ''}`}
    >
      <span className="relative block">
        <CardImage name={tile.name} imageUrl={tile.imageUrl} className="h-14 w-full" />
        <span className="absolute left-1 top-1">
          <Badge tone={TIER_TONE[tile.tier]}>{t(`tile.tier.${tile.tier}`)}</Badge>
        </span>
      </span>
      <span className="line-clamp-2 min-h-8 text-[13px] font-semibold leading-tight">
        {tile.name}
      </span>
      {hit && (
        <span className="flex items-center gap-0.5 self-start rounded-[2px] bg-rs-gold-bright px-[5px] py-0.5 text-[11px] font-semibold leading-tight text-rs-canvas">
          <SearchOutlinedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
          {hit.name} +{hit.progressWeight}
        </span>
      )}
      <span className="mt-auto flex items-baseline justify-between text-xs">
        <span className="text-rs-muted">
          {t('board.requirementShort', { count: tile.requirement })}
        </span>
        <strong>{t('tile.points', { count: tile.points })}</strong>
      </span>
    </button>
  )
}
