import { useTranslation } from 'react-i18next'
import type { BingoEvent } from '../types'

const DAY_MS = 86_400_000

/** "Oct 21, 2026, 4:04 PM → Nov 5, 2026, 2:34 PM · 15 days". */
export function EventSchedule({ event }: { event: BingoEvent }) {
  const { t, i18n } = useTranslation()
  const format = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  const start = new Date(event.start_at)
  const end = new Date(event.end_at)
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS))
  return (
    <span className="text-[13px]">
      {format.format(start)} → {format.format(end)}{' '}
      <span className="whitespace-nowrap text-rs-muted">
        · {t('events.durationDays', { count: days })}
      </span>
    </span>
  )
}
