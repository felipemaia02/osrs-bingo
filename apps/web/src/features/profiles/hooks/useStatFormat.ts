import { useTranslation } from 'react-i18next'

const HOURS_DIGITS = 1

/** Whole numbers and one-decimal hours (EHP/EHB) in the viewer's language. */
export function useStatFormat() {
  const { i18n } = useTranslation()
  const whole = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const hours = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: HOURS_DIGITS,
    maximumFractionDigits: HOURS_DIGITS,
  })
  return {
    whole: (value: number | null) => (value === null ? '—' : whole.format(value)),
    hours: (value: number | null) => (value === null ? '—' : hours.format(value)),
  }
}
