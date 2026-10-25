import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useSession } from '../../auth/hooks/useSession'
import { useOwnRegistration } from '../../teams/hooks/useTeams'
import type { BingoEvent } from '../types'
import { EventStatusBadge } from './EventStatusBadge'

/** Where an event card leads: the board when active, joining when a draft is still open. */
function useEventTarget(event: BingoEvent): { to: string; labelKey: string } | null {
  const session = useSession()
  const draft = event.status === 'draft'
  const registration = useOwnRegistration(event.id, draft ? session.data?.id : undefined)
  if (event.status === 'active') return { to: '/', labelKey: 'events.openBoard' }
  if (draft && !registration.isLoading && !registration.data)
    return { to: `/events/${event.id}/join`, labelKey: 'registration.join' }
  return null
}

/** Card header; the whole header is the link when the event leads somewhere (feature 025). */
export function EventCardTitle({ event }: { event: BingoEvent }) {
  const { t } = useTranslation()
  const target = useEventTarget(event)
  const title = (
    <h2
      id={`event-${event.id}`}
      className="m-0 font-display text-lg font-bold text-rs-gold-bright md:text-xl"
    >
      {event.name}
    </h2>
  )
  if (!target)
    return (
      <div className="flex flex-wrap items-center gap-2">
        {title}
        <EventStatusBadge status={event.status} />
      </div>
    )
  return (
    <Link
      to={target.to}
      className="group -m-1 flex flex-wrap items-center gap-2 rounded p-1 hover:bg-rs-raised"
    >
      {title}
      <EventStatusBadge status={event.status} />
      <span className="ml-auto inline-flex items-center gap-0.5 text-sm font-semibold text-rs-gold-bright">
        {t(target.labelKey)}
        <ChevronRightOutlinedIcon fontSize="small" aria-hidden="true" />
      </span>
    </Link>
  )
}
