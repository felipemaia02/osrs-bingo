import { useState } from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined'
import TimelapseOutlinedIcon from '@mui/icons-material/TimelapseOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { TIER_TONE } from '../tierTone'
import type { Tile, TileMatch } from '../types'

interface TileCardProps {
  tile: Tile
  imageUrl?: string | null
  /** Present while a search or difficulty filter is active. */
  match?: TileMatch
  onSelect?: (tile: Tile) => void
}

export function TileCard({ tile, imageUrl = tile.imageUrl, match, onSelect }: TileCardProps) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const progress = tile.progress
  const hasProgress = progress !== null
  const isComplete = hasProgress && progress >= tile.requirement
  const isInProgress = hasProgress && progress > 0 && !isComplete
  const showImage = Boolean(imageUrl) && !imageFailed
  const dimmed = match !== undefined && !match.matches
  const highlighted = match !== undefined && match.matches
  const stateLabel = isComplete
    ? t('tile.completed')
    : isInProgress
      ? t('tile.inProgress')
      : hasProgress
        ? t('tile.notStarted')
        : t('tile.progressUnavailable')
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
    state: stateLabel,
  })
  const label = matchLabel ? `${baseLabel}. ${matchLabel}` : baseLabel
  const borderClass = highlighted
    ? 'border-rs-gold ring-1 ring-rs-gold'
    : isComplete
      ? 'border-rs-success/80'
      : 'border-rs-border/60 hover:border-rs-border-strong'

  const body = (
    <>
      <div className="relative h-24 overflow-hidden border-b border-rs-border/50 bg-rs-inset">
        {showImage ? (
          <img
            src={imageUrl ?? undefined}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-contain p-1.5 opacity-90 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="rs-texture flex h-full flex-col items-center justify-center gap-1 text-rs-muted">
            <ImageNotSupportedOutlinedIcon fontSize="small" aria-hidden="true" />
            <span className="text-[10px]">{t('tile.imageUnavailable')}</span>
          </div>
        )}
        <div className="absolute left-1.5 top-1.5">
          <Badge tone={TIER_TONE[tile.tier]}>{t(`tile.tier.${tile.tier}`)}</Badge>
        </div>
        <div
          className={`absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-sm border ${
            isComplete
              ? 'border-rs-success bg-rs-success text-rs-inset'
              : 'border-rs-border/60 bg-rs-inset/90 text-rs-muted'
          }`}
          title={stateLabel}
        >
          {isComplete ? (
            <CheckCircleIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          ) : (
            <TimelapseOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-rs-text">
          {tile.name}
        </p>
        {highlighted && (
          <p className="mt-1 truncate text-[11px] font-semibold text-rs-gold-bright">
            {matchLabel}
          </p>
        )}
        <div className="mt-auto pt-2">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
            <span className={isComplete ? 'font-semibold text-rs-success' : 'text-rs-muted'}>
              {stateLabel}
            </span>
            <span className="font-semibold text-rs-gold-bright">
              {t('tile.points', { count: tile.points })}
            </span>
          </div>
          {hasProgress ? (
            <>
              <ProgressBar
                value={progress}
                max={tile.requirement}
                label={t('tile.progressLabel', { name: tile.name })}
                complete={isComplete}
              />
              <p className="mt-1 text-right text-[11px] tabular-nums text-rs-muted">
                {t('tile.progressValue', { current: progress, required: tile.requirement })}
              </p>
            </>
          ) : (
            <p className="text-right text-[11px] tabular-nums text-rs-muted">
              {t('tile.requirementValue', { required: tile.requirement })}
            </p>
          )}
        </div>
      </div>
    </>
  )

  const className = `group flex h-full w-full flex-col overflow-hidden rounded-sm border bg-rs-raised text-left transition-[opacity,border-color] ${borderClass} ${
    dimmed ? 'opacity-35' : ''
  }`

  if (!onSelect) {
    return (
      <article className={className} aria-label={`${tile.name}: ${stateLabel}`}>
        {body}
      </article>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onSelect(tile)}
      aria-label={label}
      className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rs-gold`}
    >
      {body}
    </button>
  )
}
