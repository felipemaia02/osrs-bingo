import { useTranslation } from 'react-i18next'
import type { CardRevision } from '../types'

type RuleFields = Pick<
  CardRevision,
  'tile_score' | 'completion_requirement' | 'drops' | 'rule_note' | 'requires_preverification'
>

/** Read-only card rules: drop weights are progress units, never direct team points. */
export function CardRuleDetails({ card }: { card: RuleFields }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <p className="m-0 font-semibold">
        {t('cards.rules.completion', {
          score: card.tile_score,
          requirement: card.completion_requirement,
        })}
      </p>
      <ul className="m-0 list-none rounded-[3px] border border-rs-border/45 bg-rs-inset p-0">
        {card.drops.map((drop, index) => (
          <li
            key={drop.key}
            className={`px-3 py-2 ${index < card.drops.length - 1 ? 'border-b border-rs-border/35' : ''}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span>{drop.name}</span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-rs-gold-bright">
                {t('cards.rules.progress', { count: drop.progress_weight })}
              </span>
            </div>
            {drop.verification_note && (
              <p className="mb-0 mt-1 text-xs text-rs-muted">
                {t('cards.rules.verification', { note: drop.verification_note })}
              </p>
            )}
            {drop.counting_restriction && (
              <p className="mb-0 mt-1 text-xs text-rs-muted">
                {t('cards.rules.restriction', { note: drop.counting_restriction })}
              </p>
            )}
          </li>
        ))}
      </ul>
      {card.requires_preverification && card.rule_note && (
        <p className="m-0 rounded-[3px] border border-rs-info bg-rs-info-bg px-2.5 py-2 text-xs text-rs-info-banner-text">
          <strong>{t('cards.preverification')}:</strong> {card.rule_note}
        </p>
      )}
    </div>
  )
}
