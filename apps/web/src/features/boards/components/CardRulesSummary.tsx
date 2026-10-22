import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { TIER_TONE } from '../../bingo/tierTone'
import type { BuilderCard } from '../hooks/useBuilderCards'

/** Drops grouped by progress weight: "Tanzanite Fang · Magic Fang  +1 each". */
function groupByWeight(card: BuilderCard): Array<{ weight: number; names: string[] }> {
  const groups = new Map<number, string[]>()
  for (const drop of card.drops) {
    groups.set(drop.progress_weight, [...(groups.get(drop.progress_weight) ?? []), drop.name])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weight, names]) => ({ weight, names }))
}

/** Selected card rules panel (boards-a-desktop). Weights are progress, never points. */
export function CardRulesSummary({ card }: { card: BuilderCard }) {
  const { t } = useTranslation()
  const groups = groupByWeight(card)
  return (
    <section
      aria-label={t('boards.rules.label')}
      className="flex flex-col gap-2 rounded border border-rs-border bg-rs-surface p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 font-display text-base text-rs-gold-bright">{card.name}</h2>
        <Badge tone={TIER_TONE[card.difficulty]}>
          {t(`tile.tier.${card.difficulty}`)} · {t('tile.points', { count: card.points })}
        </Badge>
      </div>
      <span className="text-[13px]">
        {t('boards.rules.completes', { requirement: card.requirement, revision: card.revision })}
        {card.changeReason && (
          <span className="text-rs-muted">
            {' '}
            {t('boards.rules.reason', { reason: card.changeReason })}
          </span>
        )}
      </span>
      <div>
        {groups.map(({ weight, names }, index) => (
          <div
            key={weight}
            className={`flex justify-between gap-2 py-1.5 text-[13px] ${
              index < groups.length - 1 ? 'border-b border-rs-border/35' : ''
            }`}
          >
            <span>{names.join(' · ')}</span>
            <span className="whitespace-nowrap text-xs font-semibold text-rs-gold-bright">
              {names.length > 1
                ? t('boards.rules.each', { weight })
                : t('boards.rules.single', { weight })}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
