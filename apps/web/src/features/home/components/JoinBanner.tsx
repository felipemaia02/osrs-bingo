import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useSession } from '../../auth/hooks/useSession'
import { useEventCountdown } from '../../events/hooks/useEventCountdown'
import { blocksJoining } from '../../events/rules'
import type { BingoEvent } from '../../events/types'
import { EventRegistration } from '../../teams/components/EventRegistration'
import { useOwnRegistration } from '../../teams/hooks/useTeams'
import { PRIMARY_LINK_CLASS } from './linkClasses'

/** The event open for registration (068): join, log in, or the player's own registration. */
export function JoinBanner({ event }: { event: BingoEvent }) {
  const { t } = useTranslation()
  const session = useSession()
  const user = session.data ?? null
  const registration = useOwnRegistration(event.id, user?.id)
  const { phase, duration } = useEventCountdown(event)
  if (session.isLoading || (user && registration.isLoading)) return null
  const registered = Boolean(user) && blocksJoining(registration.data)
  return (
    <section
      aria-labelledby="join-banner"
      className="flex flex-col gap-3 rounded border border-rs-gold bg-rs-raised p-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="join-banner" className="m-0 font-display text-lg text-rs-gold-bright">
            {t('homePage.join.title', { name: event.name })}
          </h2>
          <p className="m-0 text-sm text-rs-text">
            {t(
              registered
                ? 'homePage.join.registeredText'
                : user
                  ? 'homePage.join.text'
                  : 'homePage.join.loginText',
            )}
          </p>
          {phase === 'upcoming' && (
            <p className="m-0 text-xs text-rs-gold">
              {t('shell.event.startsIn', { time: duration })}
            </p>
          )}
        </div>
        {!registered &&
          (user ? (
            <Link to={`/events/${event.id}/join`} className={PRIMARY_LINK_CLASS}>
              <HowToRegOutlinedIcon fontSize="small" aria-hidden="true" />
              {t('homePage.join.action')}
            </Link>
          ) : (
            <Link to="/login" className={PRIMARY_LINK_CLASS}>
              <LoginOutlinedIcon fontSize="small" aria-hidden="true" />
              {t('homePage.join.login')}
            </Link>
          ))}
      </div>
      {/* Once joined, the banner shows the registration instead of the call to action. */}
      {registered && <EventRegistration event={event} />}
    </section>
  )
}
