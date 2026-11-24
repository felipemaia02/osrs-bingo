import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { useSession } from '../../auth/hooks/useSession'
import { EventSchedule } from '../../events/components/EventSchedule'
import type { BingoEvent } from '../../events/types'
import { useOwnTeamScore, usePodium } from '../../scoring/hooks/useScoring'
import type { PodiumTeam } from '../../scoring/types'
import { useOwnRegistration } from '../../teams/hooks/useTeams'

const CHAMPION = 1

function TeamChip({ team }: { team: PodiumTeam }) {
  return (
    <strong
      className={`inline-flex min-h-8 max-w-full items-center truncate rounded-[3px] px-2.5 text-rs-text ${
        team.team_color ? '' : 'bg-rs-raised'
      }`}
      style={team.team_color ? { backgroundColor: team.team_color } : undefined}
    >
      {team.team_name}
    </strong>
  )
}

function PodiumCard({ team }: { team: PodiumTeam }) {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language)
  const champion = team.position === CHAMPION
  return (
    <li
      className={`flex flex-col gap-2 rounded border p-3 ${
        champion ? 'border-rs-gold bg-rs-raised md:p-4' : 'border-rs-border bg-rs-inset'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-rs-gold">
        {champion ? (
          <EmojiEventsIcon fontSize="small" aria-hidden="true" />
        ) : (
          <MilitaryTechOutlinedIcon fontSize="small" aria-hidden="true" />
        )}
        {champion
          ? t('podium.champion')
          : t('ranking.place', { count: team.position, ordinal: true })}
        {team.tied && <Badge tone="gold">{t('podium.tied')}</Badge>}
      </span>
      <TeamChip team={team} />
      <span className="flex items-baseline gap-2">
        <strong
          className={`font-display leading-none text-rs-gold-bright ${champion ? 'text-[32px]' : 'text-2xl'}`}
        >
          {number.format(team.total)}
        </strong>
        <span className="text-xs text-rs-muted">
          {t('podium.points')} · {t('podium.tiles', { count: team.completed_tiles })}
        </span>
      </span>
      {team.members.length > 0 && (
        <span className="text-xs text-rs-muted">{team.members.join(', ')}</span>
      )}
    </li>
  )
}

/** The viewer's own final result, when they played (071 FR-003). */
function OwnResult({ event, podium }: { event: BingoEvent; podium: PodiumTeam[] }) {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const registration = useOwnRegistration(event.id, session.data?.id)
  const own = registration.data
  const onTeam = own?.status === 'approved' && Boolean(own.team_id)
  const score = useOwnTeamScore(event.id, onTeam)
  if (!score.data) return null
  const place = podium.find((team) => team.team_id === score.data.team_id)
  const total = new Intl.NumberFormat(i18n.language).format(score.data.total)
  return (
    <p className="m-0 text-sm">
      {place
        ? t('podium.yourPlace', {
            team: score.data.team_name,
            place: t('ranking.place', { count: place.position, ordinal: true }),
            total,
          })
        : t('podium.yourTotal', { team: score.data.team_name, total })}
    </p>
  )
}

/** "Bingo finished" with the top 3, for 7 days after the event ends (feature 071). */
export function FinishedEventPodium({ event }: { event: BingoEvent }) {
  const { t } = useTranslation()
  const podium = usePodium(event.id)
  if (!podium.data || !podium.data.teams.length) return null
  const teams = podium.data.teams
  return (
    <section
      aria-labelledby="home-podium"
      className="flex flex-col gap-3 rounded border border-rs-gold bg-rs-surface p-4 md:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
            {t('podium.eyebrow')}
          </span>
          <h2
            id="home-podium"
            className="m-0 font-display text-xl font-bold text-rs-gold-bright md:text-2xl"
          >
            {podium.data.event_name}
          </h2>
          <EventSchedule event={event} />
        </div>
        <Badge tone={podium.data.final ? 'success' : 'gold'}>
          {t(podium.data.final ? 'podium.final' : 'podium.provisional')}
        </Badge>
      </div>
      <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-[1.4fr_1fr_1fr]">
        {teams.map((team) => (
          <PodiumCard key={team.team_id} team={team} />
        ))}
      </ol>
      <OwnResult event={event} podium={teams} />
    </section>
  )
}
