import { useState } from 'react'
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { FormModal } from '../../../components/ui/FormModal'
import { CardRuleDetails } from '../../cards/components/CardRuleDetails'
import type { Tile } from '../types'
import { TIER_TONE } from '../tierTone'

/** Read-only tile rules. MUI Modal restores focus to the tile that opened it. */
export function TileDetailsDialog({ tile, onClose }: { tile: Tile; onClose: () => void }) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <FormModal title={tile.name} busy={false} onClose={onClose}>
      <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="flex h-40 items-center justify-center overflow-hidden rounded-sm border border-rs-border/50 bg-rs-inset">
            {tile.imageUrl && !imageFailed ? (
              <img
                src={tile.imageUrl}
                alt=""
                onError={() => setImageFailed(true)}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-rs-muted">
                <ImageNotSupportedOutlinedIcon aria-hidden="true" />
                <span className="text-xs">{t('tile.imageUnavailable')}</span>
              </div>
            )}
          </div>
          {tile.imageSourceUrl && (
            <a
              href={tile.imageSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-[11px] text-rs-gold hover:underline"
            >
              {t('tile.imageSource')}
              {tile.imageAttribution ? ` · ${tile.imageAttribution}` : ''}
            </a>
          )}
        </div>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-rs-muted">
            <Badge tone={TIER_TONE[tile.tier]}>{t(`tile.tier.${tile.tier}`)}</Badge>
            <span>{t('board.row', { row: tile.row })}</span>
            <span>·</span>
            <span>{t('board.column', { column: tile.col })}</span>
          </div>
          <CardRuleDetails
            card={{
              tile_score: tile.points,
              completion_requirement: tile.requirement,
              drops: tile.drops,
              rule_note: tile.ruleNote,
            }}
          />
          <p className="text-xs text-rs-muted">{t('tile.progressPending')}</p>
        </div>
      </div>
    </FormModal>
  )
}
