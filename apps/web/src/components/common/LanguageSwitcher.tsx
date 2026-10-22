import { useState } from 'react'
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined'
import { useTranslation } from 'react-i18next'
import { ThemedMenu, ThemedMenuItem } from '../ui/ThemedMenu'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
  { code: 'es', label: 'ES' },
] as const

function useLanguages() {
  const { i18n } = useTranslation()
  const current =
    LANGUAGES.find((language) => i18n.language.startsWith(language.code)) ?? LANGUAGES[0]
  return { current, change: (code: string) => void i18n.changeLanguage(code) }
}

/** Desktop: segmented EN / PT / ES control; the active language is filled gold. */
export function LanguageSwitcher() {
  const { t } = useTranslation()
  const { current, change } = useLanguages()

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={t('language.label')}>
      <TranslateOutlinedIcon className="mr-0.5 text-rs-muted" fontSize="small" aria-hidden="true" />
      {LANGUAGES.map((language) => {
        const isActive = language.code === current.code
        return (
          <button
            type="button"
            key={language.code}
            onClick={() => change(language.code)}
            aria-pressed={isActive}
            aria-label={t(`language.${language.code}`)}
            className={`min-h-8 min-w-9 rounded-[3px] border border-transparent text-xs font-semibold transition-colors ${
              isActive ? 'bg-rs-gold text-rs-canvas' : 'text-rs-muted hover:text-rs-text'
            }`}
          >
            {language.label}
          </button>
        )
      })}
    </div>
  )
}

/** Mobile: a compact button with the current code that opens the language menu. */
export function LanguageMenuButton() {
  const { t } = useTranslation()
  const { current, change } = useLanguages()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  return (
    <>
      <button
        type="button"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor ? 'language-menu' : undefined}
        aria-label={t('language.current', { language: t(`language.${current.code}`) })}
        className="inline-flex min-h-10 items-center gap-2 rounded-[3px] border border-rs-border bg-rs-surface px-2 text-[13px] text-rs-text"
      >
        <TranslateOutlinedIcon fontSize="small" aria-hidden="true" />
        {current.label}
      </button>
      <ThemedMenu id="language-menu" anchorEl={anchor} onClose={() => setAnchor(null)}>
        {LANGUAGES.map((language) => (
          <ThemedMenuItem
            key={language.code}
            selected={language.code === current.code}
            onClick={() => {
              change(language.code)
              setAnchor(null)
            }}
          >
            {t(`language.${language.code}`)}
          </ThemedMenuItem>
        ))}
      </ThemedMenu>
    </>
  )
}
