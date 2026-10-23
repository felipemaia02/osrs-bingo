import { useTranslation } from 'react-i18next'
import { FormModal } from '../../../components/ui/FormModal'
import { EventRulesText } from '../../events/components/EventRulesText'

const HELP_KEYS = ['progress', 'completion', 'excess', 'details'] as const

interface HelpDialogProps {
  /** Rows (and columns) of the board, plus its line bonuses (null when not set). */
  size: number
  rowBonus: number | null
  columnBonus: number | null
  /** The administrator's written rules for this event. */
  rulesText: string | null
  onClose: () => void
}

/** "How tiles are completed": tile semantics, this board's line bonuses and the event rules. */
export function HelpDialog({ size, rowBonus, columnBonus, rulesText, onClose }: HelpDialogProps) {
  const { t } = useTranslation()
  const lines =
    rowBonus === null || columnBonus === null
      ? t('board.help.linesNotSet')
      : t('board.help.lines', { size, row: rowBonus, column: columnBonus })
  return (
    <FormModal
      title={t('board.help.title')}
      busy={false}
      size={rulesText ? 'lg' : 'sm'}
      onClose={onClose}
    >
      <ul className="m-0 list-disc space-y-2 pl-5 text-sm leading-relaxed text-rs-text">
        {HELP_KEYS.map((key) => (
          <li key={key}>{t(`board.help.${key}`)}</li>
        ))}
        <li>{lines}</li>
      </ul>
      {rulesText && (
        <section className="mt-4 flex flex-col gap-2 border-t border-rs-border/60 pt-4">
          <h3 className="m-0 font-display text-base text-rs-gold-bright">
            {t('events.rules.section')}
          </h3>
          <EventRulesText text={rulesText} collapsible={false} />
        </section>
      )}
    </FormModal>
  )
}
