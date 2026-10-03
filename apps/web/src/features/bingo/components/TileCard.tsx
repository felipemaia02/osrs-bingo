import { useState } from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined'
import TimelapseOutlinedIcon from '@mui/icons-material/TimelapseOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import type { Tile, TileTier } from '../data/tiles'

interface TileCardProps {
  tile: Tile
  imageUrl?: string | null
}

const TIER_TONE: Record<TileTier, 'danger' | 'gold' | 'success'> = {
  Low: 'success',
  Mid: 'gold',
  High: 'danger',
}

export function TileCard({ tile, imageUrl }: TileCardProps) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const isComplete = tile.progress >= tile.requirement
  const isInProgress = tile.progress > 0 && !isComplete
  const showImage = Boolean(imageUrl) && !imageFailed
  const stateLabel = isComplete
    ? t('tile.completed')
    : isInProgress
      ? t('tile.inProgress')
      : t('tile.notStarted')

  return (
    <article
      className={`group flex min-h-64 flex-col overflow-hidden rounded-sm border bg-rs-raised transition-colors ${
        isComplete ? 'border-rs-success/80' : 'border-rs-border/60 hover:border-rs-border-strong'
      }`}
      aria-label={`${tile.name}: ${stateLabel}`}
    >
      <div className="relative h-32 overflow-hidden border-b border-rs-border/50 bg-rs-inset">
        {showImage ? (
          <img
            src={imageUrl ?? undefined}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover object-top opacity-80 transition-[opacity,transform] duration-300 group-hover:scale-[1.02] group-hover:opacity-95"
          />
        ) : (
          <div className="rs-texture flex h-full flex-col items-center justify-center gap-2 text-rs-muted">
            <ImageNotSupportedOutlinedIcon aria-hidden="true" />
            <span className="text-[10px]">{t('tile.imageUnavailable')}</span>
          </div>
        )}

        <div className="absolute left-2 top-2">
          <Badge tone={TIER_TONE[tile.tier]}>{t(`tile.tier.${tile.tier}`)}</Badge>
        </div>
        <div
          className={`absolute right-2 top-2 flex size-7 items-center justify-center rounded-sm border ${
            isComplete
              ? 'border-rs-success bg-rs-success text-rs-inset'
              : 'border-rs-border/60 bg-rs-inset/90 text-rs-muted'
          }`}
          title={stateLabel}
        >
          {isComplete ? (
            <CheckCircleIcon fontSize="small" aria-hidden="true" />
          ) : (
            <TimelapseOutlinedIcon fontSize="small" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-rs-text">
          {tile.name}
        </p>
        <div className="mt-auto pt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
            <span className={isComplete ? 'font-semibold text-rs-success' : 'text-rs-muted'}>
              {stateLabel}
            </span>
            <span className="font-semibold text-rs-gold-bright">
              {t('tile.points', { count: tile.points })}
            </span>
          </div>
          <ProgressBar
            value={tile.progress}
            max={tile.requirement}
            label={t('tile.progressLabel', { name: tile.name })}
            complete={isComplete}
          />
          <p className="mt-1.5 text-right text-[11px] tabular-nums text-rs-muted">
            {t('tile.progressValue', { current: tile.progress, required: tile.requirement })}
          </p>
        </div>
      </div>
    </article>
  )
}
