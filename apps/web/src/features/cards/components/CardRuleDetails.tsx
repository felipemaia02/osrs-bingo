import { useTranslation } from 'react-i18next'
import type { CardRevision } from '../types'

type RuleFields = Pick<
  CardRevision,
  'tile_score' | 'completion_requirement' | 'drops' | 'rule_note'
>

/** Read-only card rules: drop weights are progress units, never direct team points. */
export function CardRuleDetails({ card }: { card: RuleFields }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 text-sm">
      <p className="text-rs-text">
        {t('cards.rules.completion', {
          score: card.tile_score,
          requirement: card.completion_requirement,
        })}
      </p>
      <ul className="divide-y divide-rs-border/30 rounded-sm border border-rs-border/40">
        {card.drops.map((drop) => (
          <li key={drop.key} className="px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-rs-text">{drop.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-rs-gold">
                {t('cards.rules.progress', { count: drop.progress_weight })}
              </span>
            </div>
            {drop.verification_note && (
              <p className="mt-1 text-xs text-rs-muted">
                {t('cards.rules.verification', { note: drop.verification_note })}
              </p>
            )}
            {drop.counting_restriction && (
              <p className="mt-1 text-xs text-rs-muted">
                {t('cards.rules.restriction', { note: drop.counting_restriction })}
              </p>
            )}
          </li>
        ))}
      </ul>
      {card.rule_note && <p className="text-xs text-rs-muted">{card.rule_note}</p>}
    </div>
  )
}
