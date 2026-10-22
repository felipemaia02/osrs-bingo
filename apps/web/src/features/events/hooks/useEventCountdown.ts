import { useTranslation } from 'react-i18next'
import { useNow } from '../../../hooks/useNow'
import { splitDuration } from '../../../lib/time/duration'
import type { BingoEvent } from '../types'

export type EventPhase = 'upcoming' | 'running' | 'ended'

export interface EventCountdown {
  phase: EventPhase
  /** "13 d 22 h" or "3 h 10 min"; null once the scheduled end has passed. */
  duration: string | null
}

/** Time until the event starts or ends, refreshed every minute. */
export function useEventCountdown(event: BingoEvent): EventCountdown {
  const { t } = useTranslation()
  const now = useNow()
  const start = Date.parse(event.start_at)
  const end = Date.parse(event.end_at)
  const format = (ms: number) => {
    const { days, hours, minutes } = splitDuration(ms)
    return days > 0
      ? t('shell.event.daysHours', { days, hours })
      : t('shell.event.hoursMinutes', { hours, minutes })
  }
  if (now < start) return { phase: 'upcoming', duration: format(start - now) }
  if (now < end) return { phase: 'running', duration: format(end - now) }
  return { phase: 'ended', duration: null }
}
