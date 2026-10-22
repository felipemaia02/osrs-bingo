import { useTranslation } from 'react-i18next'
import { FormModal } from '../../../components/ui/FormModal'

const HELP_KEYS = ['progress', 'completion', 'excess', 'bonuses', 'details'] as const

/** "How tiles are completed": approved tile semantics only; bonuses without values. */
export function HelpDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <FormModal title={t('board.help.title')} busy={false} size="sm" onClose={onClose}>
      <ul className="m-0 list-disc space-y-2 pl-5 text-sm leading-relaxed text-rs-text">
        {HELP_KEYS.map((key) => (
          <li key={key}>{t(`board.help.${key}`)}</li>
        ))}
      </ul>
    </FormModal>
  )
}
