import { useTranslation } from 'react-i18next'
import { FormModal } from '../../../components/ui/FormModal'
import { EventRulesText } from '../../events/components/EventRulesText'
import type { RulesAddendum } from '../../events/types'

const HELP_KEYS = ['progress', 'completion', 'excess', 'details'] as const

interface HelpDialogProps {
  /** Rows (and columns) of the board, plus its line bonuses (null when not set). */
  size: number
  rowBonus: number | null
  columnBonus: number | null
  /** The administrator's written rules for this event. */
  rulesText: string | null
  /** Clarifications and tiles fixed during the event (feature 036). */
  addenda?: RulesAddendum[]
  tileUpdates?: Array<{ name: string; reason: string; at: string }>
  onClose: () => void
}

/** "How tiles are completed": tile semantics, this board's line bonuses and the event rules. */
export function HelpDialog({
  size,
  rowBonus,
  columnBonus,
  rulesText,
  addenda = [],
  tileUpdates = [],
  onClose,
}: HelpDialogProps) {
  const { t, i18n } = useTranslation()
  const showRules = Boolean(rulesText) || addenda.length > 0
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
  const lines =
    rowBonus === null || columnBonus === null
      ? t('board.help.linesNotSet')
      : t('board.help.lines', { size, row: rowBonus, column: columnBonus })
  return (
    <FormModal
      title={t('board.help.title')}
      busy={false}
      size={showRules || tileUpdates.length ? 'lg' : 'sm'}
      onClose={onClose}
    >
      <ul className="m-0 list-disc space-y-2 pl-5 text-sm leading-relaxed text-rs-text">
        {HELP_KEYS.map((key) => (
          <li key={key}>{t(`board.help.${key}`)}</li>
        ))}
        <li>{lines}</li>
      </ul>
      {tileUpdates.length > 0 && (
        <section className="mt-4 flex flex-col gap-2 border-t border-rs-border/60 pt-4">
          <h3 className="m-0 font-display text-base text-rs-gold-bright">
            {t('board.help.updates')}
          </h3>
          <ul className="m-0 list-disc space-y-1 pl-5 text-[13px]">
            {tileUpdates.map((update) => (
              <li key={`${update.name}-${update.at}`}>
                <strong>{update.name}</strong> · {date.format(new Date(update.at))}: {update.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
      {showRules && (
        <section className="mt-4 flex flex-col gap-2 border-t border-rs-border/60 pt-4">
          <h3 className="m-0 font-display text-base text-rs-gold-bright">
            {t('events.rules.section')}
          </h3>
          <EventRulesText text={rulesText} addenda={addenda} collapsible={false} />
        </section>
      )}
    </FormModal>
  )
}
