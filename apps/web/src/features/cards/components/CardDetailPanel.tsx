import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { CardImage } from '../../../components/ui/CardImage'
import { TIER_TONE } from '../../bingo/tierTone'
import type { CardSummary } from '../types'
import { CardRuleDetails } from './CardRuleDetails'

interface CardDetailPanelProps {
  card: CardSummary | null
  onClose: () => void
}

/** Fixed desktop panel with the selected card's rules, revision and image source. */
export function CardDetailPanel({ card, onClose }: CardDetailPanelProps) {
  const { t } = useTranslation()
  return (
    <aside
      aria-label={t('cards.panel.label')}
      className="sticky top-[84px] flex w-[380px] shrink-0 flex-col overflow-hidden rounded border border-rs-border bg-rs-surface"
    >
      {!card ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-rs-muted">
          <TouchAppOutlinedIcon className="text-rs-gold" aria-hidden="true" />
          {t('cards.panel.prompt')}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-rs-border px-3.5 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold">
              {t(`cards.kind.${card.revision.kind}`)}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('cards.panel.close')}
              title={t('cards.panel.close')}
              className="inline-flex size-8 items-center justify-center rounded-[3px] border border-rs-border bg-rs-surface text-rs-text"
            >
              <CloseOutlinedIcon fontSize="small" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-3 p-3.5">
            <CardImage
              name={card.revision.name}
              imageUrl={card.revision.wiki_image?.image_url}
              className="h-32 w-full"
              large
            />
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 font-display text-lg font-bold text-rs-gold-bright">
                {card.revision.name}
              </h2>
              <Badge tone={TIER_TONE[card.revision.difficulty]}>
                {t(`tile.tier.${card.revision.difficulty}`)}
              </Badge>
              {card.revision.requires_preverification && (
                <Badge tone="info">{t('cards.preverification')}</Badge>
              )}
              {card.status === 'retired' && (
                <Badge tone="danger-outline">{t('cards.status.retired')}</Badge>
              )}
            </div>
            {card.revision.description && (
              <p className="m-0 text-sm text-rs-muted">{card.revision.description}</p>
            )}
            <CardRuleDetails card={card.revision} />
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-rs-border/45 pt-3 text-[13px]">
              <dt className="text-rs-muted">{t('cards.panel.revision')}</dt>
              <dd className="m-0">
                {t('cards.revisionShort', { revision: card.current_revision })} ·{' '}
                {card.revision.change_reason}
              </dd>
              <dt className="text-rs-muted">{t('cards.panel.source')}</dt>
              <dd className="m-0">{t(`cards.source.${card.revision.provenance.source}`)}</dd>
              <dt className="text-rs-muted">{t('cards.panel.key')}</dt>
              <dd className="m-0 break-all font-mono text-xs leading-5">{card.slug}</dd>
            </dl>
            {card.revision.wiki_image ? (
              <p className="m-0 text-xs text-rs-muted">
                {t('cards.panel.image')}{' '}
                <a
                  href={card.revision.wiki_image.file_page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-rs-gold-bright hover:text-rs-gold-hover"
                >
                  {card.revision.wiki_image.file_name}
                </a>{' '}
                · {card.revision.wiki_image.attribution}
              </p>
            ) : (
              <p className="m-0 text-xs text-rs-muted">{t('cards.panel.noImage')}</p>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
