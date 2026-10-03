import type { ReactNode } from 'react'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { enUS, esES, ptBR } from '@mui/x-date-pickers/locales'
import { useTranslation } from 'react-i18next'
import 'dayjs/locale/en'
import 'dayjs/locale/es'
import 'dayjs/locale/pt-br'

const PICKER_LOCALES = {
  en: { adapter: 'en', text: enUS },
  es: { adapter: 'es', text: esES },
  pt: { adapter: 'pt-br', text: ptBR },
} as const

export function DateLocalizationProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const language = i18n.language.split('-')[0] as keyof typeof PICKER_LOCALES
  const locale = PICKER_LOCALES[language] ?? PICKER_LOCALES.en

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={locale.adapter}
      localeText={locale.text.components.MuiLocalizationProvider.defaultProps.localeText}
    >
      {children}
    </LocalizationProvider>
  )
}
