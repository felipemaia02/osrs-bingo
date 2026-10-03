import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
  { code: 'es', label: 'ES' },
] as const

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t('language.label')}>
      <TranslateOutlinedIcon className="mr-1 text-rs-muted" fontSize="small" aria-hidden="true" />
      {LANGUAGES.map((language) => {
        const isActive = i18n.language.startsWith(language.code)
        return (
          <button
            type="button"
            key={language.code}
            onClick={() => i18n.changeLanguage(language.code)}
            aria-pressed={isActive}
            aria-label={t(`language.${language.code}`)}
            className={`rounded-sm border px-2 py-1 text-xs font-semibold transition-colors ${
              isActive
                ? 'border-rs-border-strong bg-rs-gold text-rs-inset'
                : 'border-transparent text-rs-muted hover:border-rs-border hover:text-rs-text'
            }`}
          >
            {language.label}
          </button>
        )
      })}
    </div>
  )
}
