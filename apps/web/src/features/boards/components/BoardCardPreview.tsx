import { useState } from 'react'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import { useTranslation } from 'react-i18next'
import type { CardRevision } from '../../cards/types'

export function BoardCardPreview({
  card,
}: {
  card: Pick<
    CardRevision,
    'name' | 'wiki_image' | 'difficulty' | 'tile_score' | 'completion_requirement'
  >
}) {
  const { t } = useTranslation()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const url = card.wiki_image?.image_url
  return (
    <>
      <div className="flex h-20 items-center justify-center rounded-sm bg-rs-inset/60 p-2">
        {url && failedUrl !== url ? (
          <img
            src={url}
            alt=""
            loading="lazy"
            onError={() => setFailedUrl(url)}
            className="h-full max-w-full object-contain"
          />
        ) : (
          <GridViewOutlinedIcon className="text-rs-gold/40" aria-hidden="true" />
        )}
      </div>
      <span className="block font-semibold text-rs-text">{card.name}</span>
      <span className="block text-xs text-rs-gold">
        {t(`tile.tier.${card.difficulty}`)} · {t('tile.points', { count: card.tile_score })}
      </span>
      <span className="block text-xs text-rs-muted">
        {t('boards.required', { count: card.completion_requirement })}
      </span>
    </>
  )
}
