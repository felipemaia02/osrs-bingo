import { useState } from 'react'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { CardImage } from '../../../components/ui/CardImage'
import { TIER_TONE } from '../../bingo/tierTone'
import type { BuilderCard } from '../hooks/useBuilderCards'

function CardSummaryLine({ card }: { card: BuilderCard }) {
  const { t } = useTranslation()
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge tone={TIER_TONE[card.difficulty]}>{t(`tile.tier.${card.difficulty}`)}</Badge>
      <span className="text-xs text-rs-muted">
        {t('boards.mobile.pointsRequirement', {
          points: card.points,
          requirement: card.requirement,
        })}
      </span>
    </span>
  )
}

interface PickCardProps {
  positionLabel: string
  cards: BuilderCard[]
  query: string
  onQueryChange: (query: string) => void
  onPlace: (card: BuilderCard) => void
}

/** Step 2 for an empty position: expandable card list with "Place on r·c". */
export function MobilePickCard({
  positionLabel,
  cards,
  query,
  onQueryChange,
  onPlace,
}: PickCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <section
      aria-label={t('boards.mobile.step2', { position: positionLabel })}
      className="flex flex-col overflow-hidden rounded border border-rs-border bg-rs-surface"
    >
      <div className="flex flex-col gap-2 border-b border-rs-border px-3 py-2.5">
        <strong className="text-[13px]">
          {t('boards.mobile.step2Prefix')}{' '}
          <span className="text-rs-gold-bright">{positionLabel}</span>
        </strong>
        <label className="relative flex items-center">
          <SearchOutlinedIcon
            fontSize="small"
            className="pointer-events-none absolute left-2.5 text-rs-muted"
            aria-hidden="true"
          />
          <span className="sr-only">{t('boards.searchCardOrDrop')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('boards.searchCardOrDrop')}
            className="min-h-11 w-full rounded-[3px] border border-rs-border bg-rs-inset pl-[38px] pr-3 text-base text-rs-text placeholder:text-rs-muted"
          />
        </label>
      </div>
      {!cards.length && <p className="m-0 p-3 text-sm text-rs-muted">{t('boards.noResults')}</p>}
      {cards.map((card, index) => {
        const open = expanded === card.key
        const border = index < cards.length - 1 ? 'border-b border-rs-border/45' : ''
        return (
          <div
            key={card.key}
            className={`flex gap-2.5 px-3 py-2.5 ${border} ${open ? 'bg-rs-raised shadow-[inset_3px_0_0_theme(colors.rs.gold-bright)]' : ''}`}
          >
            <CardImage name={card.name} imageUrl={card.imageUrl} className="h-10 w-11 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setExpanded(open ? null : card.key)}
                className="flex min-h-11 items-center justify-between gap-2 text-left"
              >
                <span>
                  <strong>{card.name}</strong>
                  <br />
                  <CardSummaryLine card={card} />
                </span>
                {open ? (
                  <ExpandLessOutlinedIcon className="text-rs-muted" aria-hidden="true" />
                ) : (
                  <ExpandMoreOutlinedIcon className="text-rs-muted" aria-hidden="true" />
                )}
              </button>
              {open && (
                <>
                  <span className="text-xs">
                    {card.drops.map((drop, dropIndex) => (
                      <span key={drop.key}>
                        {dropIndex > 0 && ' · '}
                        {drop.name}{' '}
                        <strong className="text-rs-gold-bright">+{drop.progress_weight}</strong>
                      </span>
                    ))}
                  </span>
                  <Button variant="primary" className="w-full" onClick={() => onPlace(card)}>
                    <CheckOutlinedIcon fontSize="small" aria-hidden="true" />
                    {t('boards.mobile.place', { position: positionLabel })}
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}

interface FilledPositionProps {
  positionLabel: string
  card: BuilderCard
  swapping: boolean
  onRemove: () => void
  onSwap: () => void
  onCancelSwap: () => void
}

/** Step 2 for a filled position: remove its card or swap it with another position. */
export function MobileFilledPosition({
  positionLabel,
  card,
  swapping,
  onRemove,
  onSwap,
  onCancelSwap,
}: FilledPositionProps) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('boards.mobile.filledTitle', { position: positionLabel })}
      className="flex flex-col gap-3 rounded border border-rs-border bg-rs-surface p-3"
    >
      <strong className="text-[13px]">
        {t('boards.mobile.filledTitle', { position: positionLabel })}
      </strong>
      <div className="flex gap-2.5">
        <CardImage name={card.name} imageUrl={card.imageUrl} className="h-10 w-11 shrink-0" />
        <span>
          <strong>{card.name}</strong>
          <br />
          <CardSummaryLine card={card} />
        </span>
      </div>
      {swapping ? (
        <>
          <p role="status" className="m-0 text-sm text-rs-gold-bright">
            {t('boards.mobile.swapHint', { position: positionLabel })}
          </p>
          <Button onClick={onCancelSwap}>{t('common.cancel')}</Button>
        </>
      ) : (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onSwap}>
            {t('boards.mobile.swap')}
          </Button>
          <Button variant="danger" className="flex-1" onClick={onRemove}>
            {t('boards.mobile.remove')}
          </Button>
        </div>
      )}
    </section>
  )
}
