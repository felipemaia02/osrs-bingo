import type { ReactNode } from 'react'
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { usePublicBoard } from '../../boards/hooks/useBoards'
import { hasRules } from '../rules'
import type { BingoEvent } from '../types'
import { EventRulesText } from './EventRulesText'
import { RulesSummaryCards } from './RulesSummary'

function RulesSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="m-0 font-display text-base text-rs-gold-bright">
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Row/column bonuses of the running event's board and how the team score adds up (006). */
function ScoringRules({ event }: { event: BingoEvent }) {
  const { t } = useTranslation()
  const board = usePublicBoard(event.status === 'active' ? event.id : null)
  const rowBonus = board.data?.row_bonus ?? null
  const columnBonus = board.data?.column_bonus ?? null
  return (
    <RulesSection id="rules-scoring" title={t('rulesPage.scoring.title')}>
      {rowBonus !== null && columnBonus !== null && (
        <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-[3px] border border-rs-border/60 bg-rs-inset p-3">
            <dt className="text-rs-muted">{t('rulesPage.scoring.row')}</dt>
            <dd className="m-0 font-display text-xl text-rs-gold-bright">+{rowBonus}</dd>
          </div>
          <div className="rounded-[3px] border border-rs-border/60 bg-rs-inset p-3">
            <dt className="text-rs-muted">{t('rulesPage.scoring.column')}</dt>
            <dd className="m-0 font-display text-xl text-rs-gold-bright">+{columnBonus}</dd>
          </div>
        </dl>
      )}
      <p className="m-0 flex items-start gap-2 text-sm">
        <CalculateOutlinedIcon fontSize="small" className="text-rs-gold" aria-hidden="true" />
        {t('rulesPage.scoring.formula')}
      </p>
    </RulesSection>
  )
}

/** The bingo rules in a modal (068 revision 1): fixed summary, scoring and the event's own
 * rules with clarifications. */
export function BingoRulesModal({
  event,
  onClose,
}: {
  event: BingoEvent | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <FormModal title={t('rulesPage.title')} busy={false} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <p className="m-0 text-sm text-rs-muted">{t('rulesPage.description')}</p>
        <RulesSection id="rules-basics" title={t('rulesPage.basics')}>
          <RulesSummaryCards hasBuyIn={Boolean(event?.buy_in)} />
        </RulesSection>
        {event && <ScoringRules event={event} />}
        {event && hasRules(event) && (
          <RulesSection id="rules-event" title={t('join.rules.event')}>
            <div className="rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2">
              <EventRulesText
                text={event.rules_text ?? null}
                addenda={event.rules_addenda}
                collapsible={false}
              />
            </div>
          </RulesSection>
        )}
        <div className="flex justify-end">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </FormModal>
  )
}
