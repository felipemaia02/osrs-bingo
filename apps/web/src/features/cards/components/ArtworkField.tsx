import { useRef } from 'react'
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import type { CardArtwork } from '../types'

const ACCEPTED = 'image/png,image/jpeg,image/webp'
const ARTIST_MAX_LENGTH = 80

/** Clan artwork for the card (feature 041): upload, artist credit, remove. */
export function ArtworkField({
  artwork,
  busy,
  uploading,
  onUpload,
  onArtist,
  onRemove,
}: {
  artwork: CardArtwork | null
  busy: boolean
  uploading: boolean
  onUpload: (file: File) => void
  onArtist: (artist: string) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-2 rounded-[3px] border border-rs-border/60 bg-rs-inset p-3">
      <span className="text-[13px] font-semibold">{t('cards.artwork.title')}</span>
      <span className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept={ACCEPTED}
          aria-label={t('cards.artwork.file')}
          className="sr-only"
          onChange={(change) => {
            const file = change.target.files?.[0]
            if (file) onUpload(file)
            change.target.value = ''
          }}
        />
        <Button size="sm" disabled={busy} onClick={() => input.current?.click()}>
          <BrushOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {t(
            uploading
              ? 'common.saving'
              : artwork
                ? 'cards.artwork.replace'
                : 'cards.artwork.upload',
          )}
        </Button>
        {artwork && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
            {t('cards.artwork.remove')}
          </Button>
        )}
      </span>
      {artwork && (
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('cards.artwork.artist')}
          <input
            value={artwork.artist ?? ''}
            maxLength={ARTIST_MAX_LENGTH}
            onChange={(change) => onArtist(change.target.value)}
            placeholder={t('cards.artwork.artistPlaceholder')}
            className={`${FIELD_CLASS} font-normal`}
          />
        </label>
      )}
      <span className="text-xs text-rs-muted">{t('cards.artwork.hint')}</span>
    </div>
  )
}
