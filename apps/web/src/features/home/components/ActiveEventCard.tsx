import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EventSchedule } from '../../events/components/EventSchedule'
import { EventStatusBadge } from '../../events/components/EventStatusBadge'
import { useEventCountdown } from '../../events/hooks/useEventCountdown'
import type { BingoEvent } from '../../events/types'
import { EventRegistration } from '../../teams/components/EventRegistration'
import { HomeSection } from './HomeSection'
import { BUTTON_LINK_CLASS } from './linkClasses'

function useTimeLeft(event: BingoEvent): string {
  const { t } = useTranslation()
  const { phase, duration } = useEventCountdown(event)
  if (phase === 'upcoming') return t('shell.event.startsIn', { time: duration })
  if (phase === 'running') return t('homePage.event.endsIn', { time: duration })
  return t('shell.event.ended')
}

/** The active event with time left, the board and the viewer's registration (FR-003). */
export function ActiveEventCard({ event, loggedIn }: { event: BingoEvent; loggedIn: boolean }) {
  const { t } = useTranslation()
  const timeLeft = useTimeLeft(event)
  return (
    <HomeSection id="home-event" title={t('homePage.event.title')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <strong className="text-lg text-rs-text">{event.name}</strong>
            <EventStatusBadge status={event.status} />
          </span>
          <EventSchedule event={event} />
          <strong className="text-sm text-rs-gold-bright">{timeLeft}</strong>
        </div>
        <Link to="/board" className={BUTTON_LINK_CLASS}>
          <GridViewOutlinedIcon fontSize="small" aria-hidden="true" />
          {t('homePage.event.openBoard')}
        </Link>
      </div>
      {loggedIn && <EventRegistration event={event} />}
    </HomeSection>
  )
}

/** Shown when no event is running (FR-003). */
export function NoActiveEvent() {
  const { t } = useTranslation()
  return (
    <HomeSection id="home-event" title={t('homePage.event.title')}>
      <p className="m-0 text-sm text-rs-muted">
        {t('homePage.event.none')}{' '}
        <Link to="/events" className="font-semibold text-rs-gold-bright">
          {t('navigation.events')}
        </Link>
      </p>
    </HomeSection>
  )
}
