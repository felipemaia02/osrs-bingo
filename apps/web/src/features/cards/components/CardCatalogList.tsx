import { useState } from 'react'
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { CardImage } from '../../../components/ui/CardImage'
import { TIER_TONE } from '../../bingo/tierTone'
import type { CardSummary } from '../types'
import { CardActions } from './CardActions'
import { CardRuleDetails } from './CardRuleDetails'

interface CardListProps {
  cards: CardSummary[]
  onEdit: (card: CardSummary) => void
  onRetire: (card: CardSummary) => void
}

const CELL = 'border-b border-rs-border/45 px-3 py-2 align-middle'
const HEAD =
  'whitespace-nowrap border-b border-rs-border bg-rs-inset px-3 py-2.5 text-left text-xs font-semibold text-rs-muted'

/** Drops not linked to an OSRS item: DropTracker can only match them by name (033). */
const unlinkedDrops = (card: CardSummary) =>
  card.revision.drops.filter((drop) => !drop.item_ids?.length).length

function RetiredBadge({ card }: { card: CardSummary }) {
  const { t } = useTranslation()
  return (
    <>
      {card.revision.requires_preverification && (
        <Badge tone="info">{t('cards.preverification')}</Badge>
      )}
      {card.status === 'retired' && (
        <Badge tone="danger-outline">{t('cards.status.retired')}</Badge>
      )}
      {card.revision.categories?.map((category) => (
        <Badge key={category} tone="neutral">
          {t(`cards.category.${category}`)}
        </Badge>
      ))}
      {unlinkedDrops(card) > 0 && card.status !== 'retired' && (
        <Badge tone="gold">⚠ {t('cards.unlinked', { count: unlinkedDrops(card) })}</Badge>
      )}
    </>
  )
}

/** Desktop table; clicking or pressing Enter on a row selects it for the detail panel. */
export function CardCatalogTable({
  cards,
  selectedId,
  onSelect,
  onEdit,
  onRetire,
}: CardListProps & { selectedId: string | null; onSelect: (card: CardSummary) => void }) {
  const { t } = useTranslation()
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={HEAD}>{t('cards.table.card')}</th>
          <th className={HEAD}>{t('cards.form.difficulty')}</th>
          <th className={`${HEAD} text-right`}>{t('cards.table.points')}</th>
          <th className={`${HEAD} text-right`}>{t('cards.table.requirement')}</th>
          <th className={`${HEAD} text-right`}>{t('cards.table.drops')}</th>
          <th className={HEAD}>{t('cards.table.revision')}</th>
          <th className={`${HEAD} text-right`}>{t('cards.table.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {cards.map((card) => {
          const selected = card.id === selectedId
          return (
            <tr
              key={card.id}
              tabIndex={0}
              aria-selected={selected}
              aria-label={t('cards.rowLabel', { name: card.revision.name })}
              onClick={() => onSelect(card)}
              onKeyDown={(key) => {
                if (key.key === 'Enter' || key.key === ' ') {
                  key.preventDefault()
                  onSelect(card)
                }
              }}
              className={`cursor-pointer ${selected ? 'bg-rs-raised' : 'hover:bg-rs-raised/50'}`}
            >
              <td className={CELL}>
                <span className="flex items-center gap-3">
                  <CardImage
                    name={card.revision.name}
                    imageUrl={card.revision.wiki_image?.image_url}
                    className="h-10 w-12 shrink-0"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 font-semibold">
                      {card.revision.name} <RetiredBadge card={card} />
                    </span>
                    <span className="text-xs text-rs-muted">
                      {t(`cards.kind.${card.revision.kind}`)}
                    </span>
                  </span>
                </span>
              </td>
              <td className={CELL}>
                <Badge tone={TIER_TONE[card.revision.difficulty]}>
                  {t(`tile.tier.${card.revision.difficulty}`)}
                </Badge>
              </td>
              <td className={`${CELL} text-right tabular-nums`}>{card.revision.tile_score}</td>
              <td className={`${CELL} text-right tabular-nums`}>
                {card.revision.completion_requirement}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>{card.revision.drops.length}</td>
              <td className={`${CELL} text-rs-muted`}>
                {t('cards.revisionShort', { revision: card.current_revision })}
              </td>
              <td className={CELL}>
                <CardActions card={card} mobile={false} onEdit={onEdit} onRetire={onRetire} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Mobile cards with a "Rules" toggle and 44 px actions. */
export function CardCatalogCards({ cards, onEdit, onRetire }: CardListProps) {
  const { t } = useTranslation()
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {cards.map((card) => {
        const open = openId === card.id
        const rulesId = `card-rules-${card.id}`
        return (
          <li
            key={card.id}
            className="flex flex-col gap-2.5 rounded border border-rs-border bg-rs-surface p-3"
          >
            <div className="flex items-center gap-3">
              <CardImage
                name={card.revision.name}
                imageUrl={card.revision.wiki_image?.image_url}
                className="h-12 w-[52px] shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <strong className="break-words">{card.revision.name}</strong>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={TIER_TONE[card.revision.difficulty]}>
                    {t(`tile.tier.${card.revision.difficulty}`)}
                  </Badge>
                  <RetiredBadge card={card} />
                </span>
              </div>
            </div>
            <span className="text-xs text-rs-muted">
              {t('cards.mobileSummary', {
                score: card.revision.tile_score,
                requirement: card.revision.completion_requirement,
                count: card.revision.drops.length,
                revision: card.current_revision,
              })}
            </span>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={rulesId}
              onClick={() => setOpenId(open ? null : card.id)}
              className="inline-flex min-h-11 items-center gap-1 self-start text-[13px] text-rs-gold-bright"
            >
              {open ? (
                <ExpandLessOutlinedIcon fontSize="small" aria-hidden="true" />
              ) : (
                <ExpandMoreOutlinedIcon fontSize="small" aria-hidden="true" />
              )}
              {t('cards.rules.title')}
            </button>
            {open && (
              <div id={rulesId}>
                <CardRuleDetails card={card.revision} />
              </div>
            )}
            <CardActions card={card} mobile onEdit={onEdit} onRetire={onRetire} />
          </li>
        )
      })}
    </ul>
  )
}
