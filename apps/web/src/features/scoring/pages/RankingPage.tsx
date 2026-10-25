import { useState } from 'react'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Badge } from '../../../components/ui/Badge'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useEvents } from '../../events/hooks/useEvents'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import { useRanking } from '../hooks/useScoring'
import type { Ranking, RankingTeam } from '../types'

const CELL = 'border-b border-rs-border/45 px-3 py-2.5 align-middle'
const HEAD =
  'whitespace-nowrap border-b border-rs-border bg-rs-inset px-3 py-2.5 text-left text-xs font-semibold text-rs-muted'

function usePlace() {
  const { t } = useTranslation()
  return (team: RankingTeam) =>
    `${t('ranking.place', { count: team.position, ordinal: true })}${
      team.tied ? ` ${t('ranking.tie')}` : ''
    }`
}

function TeamName({ team }: { team: RankingTeam }) {
  const { t } = useTranslation()
  return (
    <span className="flex items-center gap-2">
      <TeamEmblem team={{ name: team.team_name, color: team.team_color }} size="md" />
      <span className="flex flex-col">
        <strong>{team.team_name}</strong>
        <span className="text-xs text-rs-muted">
          {t('ranking.members', { count: team.member_count })}
        </span>
      </span>
    </span>
  )
}

function TeamTable({ ranking }: { ranking: Ranking }) {
  const { t } = useTranslation()
  const place = usePlace()
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={HEAD}>{t('ranking.position')}</th>
          <th className={HEAD}>{t('ranking.team')}</th>
          <th className={`${HEAD} text-right`}>{t('ranking.tiles')}</th>
          <th className={`${HEAD} text-right`}>{t('ranking.rows')}</th>
          <th className={`${HEAD} text-right`}>{t('ranking.columns')}</th>
          {ranking.bonus_count > 0 && (
            <th className={`${HEAD} text-right`}>{t('ranking.bonus')}</th>
          )}
          <th className={`${HEAD} text-right`}>{t('ranking.total')}</th>
        </tr>
      </thead>
      <tbody>
        {ranking.teams.map((team) => (
          <tr key={team.team_id}>
            <td className={`${CELL} whitespace-nowrap font-semibold`}>
              {team.tied ? <Badge tone="gold">{place(team)}</Badge> : place(team)}
            </td>
            <td className={CELL}>
              <TeamName team={team} />
            </td>
            <td className={`${CELL} text-right tabular-nums`}>
              {team.tile_points}
              <span className="block text-xs text-rs-muted">
                {t('ranking.tilesDone', { count: team.completed_tiles, total: ranking.tile_count })}
              </span>
            </td>
            <td className={`${CELL} text-right tabular-nums`}>
              {team.row_points}
              <span className="block text-xs text-rs-muted">×{team.completed_rows}</span>
            </td>
            <td className={`${CELL} text-right tabular-nums`}>
              {team.column_points}
              <span className="block text-xs text-rs-muted">×{team.completed_columns}</span>
            </td>
            {ranking.bonus_count > 0 && (
              <td className={`${CELL} text-right tabular-nums`}>
                {team.bonus_points}
                <span className="block text-xs text-rs-muted">
                  {team.completed_bonus}/{ranking.bonus_count}
                </span>
              </td>
            )}
            <td className={`${CELL} text-right font-display text-xl font-bold text-rs-gold-bright`}>
              {team.total}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TeamCards({ ranking }: { ranking: Ranking }) {
  const { t } = useTranslation()
  const place = usePlace()
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {ranking.teams.map((team) => (
        <li
          key={team.team_id}
          className="flex flex-col gap-2 rounded border border-rs-border bg-rs-surface p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <TeamName team={team} />
            <span className="flex flex-col items-end">
              <span className="text-xs font-semibold">{place(team)}</span>
              <strong className="font-display text-xl text-rs-gold-bright">{team.total}</strong>
            </span>
          </div>
          <span className="text-xs text-rs-muted">
            {t('ranking.breakdown', {
              tiles: team.tile_points,
              done: team.completed_tiles,
              total: ranking.tile_count,
              rows: team.row_points,
              columns: team.column_points,
            })}
            {ranking.bonus_count > 0 &&
              ` · ${t('ranking.bonusShort', { points: team.bonus_points })}`}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Contributions({ ranking }: { ranking: Ranking }) {
  const { t, i18n } = useTranslation()
  const [teamId, setTeamId] = useState(ranking.teams[0]?.team_id ?? '')
  const format = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const players = ranking.players.filter((player) => player.team_id === teamId)
  return (
    <section
      aria-label={t('ranking.contribution')}
      className="flex w-full flex-col gap-3 rounded border border-rs-border bg-rs-surface p-3.5 md:w-[380px] md:shrink-0"
    >
      <div>
        <h2 className="m-0 font-display text-lg text-rs-gold-bright">
          {t('ranking.contribution')}
        </h2>
        <span className="text-xs text-rs-muted">{t('ranking.contributionHint')}</span>
      </div>
      {ranking.teams.length > 0 && (
        <SegmentedControl<string>
          label={t('ranking.team')}
          variant="chip"
          value={teamId}
          onChange={setTeamId}
          options={ranking.teams.map((team) => ({ value: team.team_id, label: team.team_name }))}
        />
      )}
      {players.length ? (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={HEAD}>{t('ranking.player')}</th>
              <th className={`${HEAD} text-right`}>{t('ranking.contributionShort')}</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.player_id}>
                <td className={CELL}>{player.display_name}</td>
                <td className={`${CELL} text-right font-semibold tabular-nums`}>
                  {format.format(player.contribution)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="m-0 text-sm text-rs-muted">{t('ranking.noPlayers')}</p>
      )}
    </section>
  )
}

/** Private administrator ranking (future-ranking, without special bonuses). */
export function RankingPage() {
  const { t, i18n } = useTranslation()
  const isDesktop = useIsDesktop()
  const events = useEvents()
  const [chosen, setChosen] = useState<string | null>(null)
  const eventId =
    chosen ??
    events.data?.find((event) => event.status === 'active')?.id ??
    events.data?.[0]?.id ??
    null
  const ranking = useRanking(eventId)
  const time = new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' })
  const bonus = (value: number | null) => (value === null ? t('score.notConfiguredShort') : value)

  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="flex flex-col gap-3 md:gap-4">
        {!isDesktop && (
          <Link
            to="/admin"
            className="inline-flex min-h-8 items-center gap-0.5 self-start text-[13px] text-rs-gold-bright"
          >
            <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
            {t('admin.title')}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[.18em] text-rs-gold">
              {t('ranking.eyebrow')}
            </span>
            <h1 className="m-0 font-display text-[23px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
              {t('admin.ranking')}
            </h1>
            <span className="flex items-center gap-1.5 text-[13px] text-rs-muted">
              <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
              {t('ranking.private')}
            </span>
          </div>
          {events.data && events.data.length > 0 && (
            <label className="relative flex w-full items-center md:w-[320px]">
              <span className="sr-only">{t('ranking.event')}</span>
              <select
                value={eventId ?? ''}
                onChange={(change) => setChosen(change.target.value)}
                className="min-h-11 w-full appearance-none rounded-[3px] border border-rs-border bg-rs-inset pl-3 pr-9 text-base text-rs-text md:min-h-10 md:text-sm"
              >
                {events.data.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} · {t(`events.status.${event.status}`)}
                  </option>
                ))}
              </select>
              <ExpandMoreOutlinedIcon
                className="pointer-events-none absolute right-2.5"
                aria-hidden="true"
              />
            </label>
          )}
        </div>
        {events.isLoading || ranking.isLoading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : events.isError || ranking.isError ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : !ranking.data ? (
          <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
            {t('ranking.noEvent')}
          </p>
        ) : (
          <>
            <span className="text-[13px] text-rs-muted">
              {t('ranking.rules', {
                row: bonus(ranking.data.row_bonus),
                column: bonus(ranking.data.column_bonus),
              })}{' '}
              ·{' '}
              {t('ranking.calculatedAt', {
                time: time.format(Date.parse(ranking.data.calculated_at)),
              })}
            </span>
            <div className="flex flex-col items-start gap-4 md:flex-row">
              <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
                <h2 className="m-0 font-display text-lg text-rs-gold-bright">
                  {t('ranking.official')}
                </h2>
                {ranking.data.teams.length === 0 ? (
                  <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
                    {t('ranking.noTeams')}
                  </p>
                ) : isDesktop ? (
                  <div className="overflow-hidden rounded border border-rs-border bg-rs-surface">
                    <TeamTable ranking={ranking.data} />
                  </div>
                ) : (
                  <TeamCards ranking={ranking.data} />
                )}
                <span className="flex items-center gap-1.5 text-xs text-rs-muted">
                  <InfoOutlinedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
                  {t('ranking.tiesNote')}
                </span>
              </div>
              <Contributions key={ranking.data.event_id} ranking={ranking.data} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
