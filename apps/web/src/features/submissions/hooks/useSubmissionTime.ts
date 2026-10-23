import { useTranslation } from 'react-i18next'

const MINUTE_MS = 60_000
const HOUR_MINUTES = 60
const DAY_HOURS = 24

/** "Oct 23, 7:02 PM" and "12 min ago" in the viewer's language. */
export function useSubmissionTime() {
  const { i18n } = useTranslation()
  const dateTime = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const relative = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
  return {
    when: (iso: string) => dateTime.format(Date.parse(iso)),
    ago: (iso: string, now = Date.now()) => {
      const minutes = Math.round((Date.parse(iso) - now) / MINUTE_MS)
      if (Math.abs(minutes) < HOUR_MINUTES) return relative.format(minutes, 'minute')
      const hours = Math.round(minutes / HOUR_MINUTES)
      if (Math.abs(hours) < DAY_HOURS) return relative.format(hours, 'hour')
      return relative.format(Math.round(hours / DAY_HOURS), 'day')
    },
  }
}
