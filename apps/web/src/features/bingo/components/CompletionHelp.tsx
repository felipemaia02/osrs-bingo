import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import { useTranslation } from 'react-i18next'

/** Explains approved tile semantics only; bonus values stay out until scoring is approved. */
export function CompletionHelp() {
  const { t } = useTranslation()
  return (
    <details className="group border-b border-rs-border/50 px-3 py-2 sm:px-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-rs-gold hover:underline">
        <HelpOutlineOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
        {t('board.help.title')}
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-xs leading-relaxed text-rs-muted">
        <li>{t('board.help.progress')}</li>
        <li>{t('board.help.completion')}</li>
        <li>{t('board.help.excess')}</li>
        <li>{t('board.help.bonuses')}</li>
        <li>{t('board.help.details')}</li>
      </ul>
    </details>
  )
}
