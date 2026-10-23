import HourglassDisabledOutlinedIcon from '@mui/icons-material/HourglassDisabledOutlined'
import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import { useTranslation } from 'react-i18next'
import { useEventCountdown, type EventCountdown } from '../../events/hooks/useEventCountdown'
import type { BingoEvent } from '../../events/types'
import { useOwnTeamStatus } from '../../teams/hooks/useOwnTeamStatus'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import { TeamStatusValue } from './TeamStatus'

function useRemainingText(countdown: EventCountdown): string {
  const { t } = useTranslation()
  if (countdown.phase === 'upcoming')
    return t('board.context.startsIn', { time: countdown.duration })
  if (countdown.phase === 'running') return t('board.context.endsIn', { time: countdown.duration })
  return t('board.context.endReached')
}

/** Desktop page header: event identity, schedule, countdown and the viewer's own team. */
export function EventHeader({ event }: { event: BingoEvent }) {
  const { t, i18n } = useTranslation()
  const remaining = useRemainingText(useEventCountdown(event))
  const team = useOwnTeamStatus(event.id)
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="flex items-end justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[.18em] text-rs-gold">
          {t('board.activeEvent')}
        </span>
        <h1 className="m-0 font-display text-[34px] font-bold leading-[1.15] text-rs-gold-bright">
          {event.name}
        </h1>
        <div className="flex flex-wrap items-center gap-[18px]">
          <span className="inline-flex items-center gap-1.5">
            <ScheduleOutlinedIcon fontSize="small" className="text-rs-muted" aria-hidden="true" />
            {t('board.context.schedule', {
              start: date.format(Date.parse(event.start_at)),
              end: date.format(Date.parse(event.end_at)),
            })}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <HourglassTopOutlinedIcon
              fontSize="small"
              className="text-rs-muted"
              aria-hidden="true"
            />
            {remaining}
          </span>
        </div>
      </div>
      {team.kind !== 'hidden' && (
        <div className="flex items-center gap-2.5 rounded border border-rs-border bg-rs-surface px-3.5 py-2.5">
          {team.kind === 'team' && <TeamEmblem team={team.team} size="lg" />}
          <div className="flex flex-col">
            <span className="text-xs text-rs-muted">{t('board.yourTeam')}</span>
            {team.kind === 'team' ? (
              <strong>{team.team.name}</strong>
            ) : (
              <TeamStatusValue status={team} size="lg" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Mobile summary card: event name, countdown, own team and (without a score) the notice. */
export function MobileEventSummary({ event, hasScore }: { event: BingoEvent; hasScore: boolean }) {
  const { t } = useTranslation()
  const countdown = useEventCountdown(event)
  const team = useOwnTeamStatus(event.id)
  const label =
    countdown.phase === 'upcoming'
      ? t('board.startsInLabel')
      : countdown.phase === 'running'
        ? t('board.endsInLabel')
        : t('board.context.endReached')

  return (
    <div className="flex flex-col gap-2 rounded border border-rs-border bg-rs-surface p-3">
      <h1 className="m-0 font-display text-[21px] font-bold leading-[1.15] text-rs-gold-bright">
        {event.name}
      </h1>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col">
          <span className="text-rs-muted">{label}</span>
          {countdown.duration && (
            <strong className="text-[15px] text-rs-gold-bright">{countdown.duration}</strong>
          )}
        </div>
        {team.kind !== 'hidden' && (
          <div className="flex flex-col">
            <span className="text-rs-muted">{t('board.yourTeam')}</span>
            <TeamStatusValue status={team} size="sm" />
          </div>
        )}
      </div>
      {!hasScore && (
        <span className="flex items-center gap-1 text-xs text-rs-muted">
          <HourglassDisabledOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {t('board.progressUnavailableShort')}
        </span>
      )}
    </div>
  )
}
