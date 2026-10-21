import { useEffect, useState } from 'react'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import { useTranslation } from 'react-i18next'
import { useSession } from '../../auth/hooks/useSession'
import type { BingoEvent } from '../../events/types'
import { useOwnRegistration, useTeams } from '../../teams/hooks/useTeams'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** Largest whole unit (days, hours, minutes) for a localized "in 3 days" phrase. */
function relativeTime(ms: number, language: string): string {
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'always' })
  if (ms >= DAY_MS) return format.format(Math.floor(ms / DAY_MS), 'day')
  if (ms >= HOUR_MS) return format.format(Math.floor(ms / HOUR_MS), 'hour')
  return format.format(Math.max(1, Math.ceil(ms / MINUTE_MS)), 'minute')
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE_MS)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

export function EventContext({ event }: { event: BingoEvent }) {
  const { t, i18n } = useTranslation()
  const now = useNow()
  const start = Date.parse(event.start_at)
  const end = Date.parse(event.end_at)
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const remaining =
    now < start
      ? t('board.context.startsIn', { time: relativeTime(start - now, i18n.language) })
      : now < end
        ? t('board.context.endsIn', { time: relativeTime(end - now, i18n.language) })
        : t('board.context.endReached')

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <p className="flex items-center gap-2 text-rs-muted">
        <ScheduleOutlinedIcon fontSize="small" className="text-rs-gold" aria-hidden="true" />
        <span>
          {t('board.context.schedule', {
            start: dateFormat.format(start),
            end: dateFormat.format(end),
          })}
        </span>
      </p>
      <p className="font-semibold text-rs-gold-bright">{remaining}</p>
      <OwnTeam eventId={event.id} />
    </div>
  )
}

/** The viewer's own team only (BR-003); anonymous or failed reads render nothing. */
function OwnTeam({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const session = useSession()
  const registration = useOwnRegistration(eventId, session.data?.id)
  const teamId =
    registration.data?.status === 'approved' ? (registration.data.team_id ?? null) : null
  const teams = useTeams(teamId ? eventId : null)
  if (!session.data || registration.isLoading || registration.isError) return null

  const team = teams.data?.find((candidate) => candidate.id === teamId)
  const message = !registration.data
    ? t('board.context.notRegistered')
    : registration.data.status === 'pending'
      ? t('board.context.pending')
      : registration.data.status === 'removed'
        ? t('board.context.removed')
        : !teamId
          ? t('board.context.unassigned')
          : team
            ? t('board.context.team', { team: team.name })
            : null
  if (!message) return null

  return (
    <p className="flex items-center gap-2 text-rs-text">
      <GroupsOutlinedIcon fontSize="small" className="text-rs-gold" aria-hidden="true" />
      {team?.color && (
        <span
          className="size-2.5 rounded-full border border-rs-border"
          style={{ backgroundColor: team.color }}
          aria-hidden="true"
        />
      )}
      <span>{message}</span>
    </p>
  )
}
