import { useState } from 'react'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useEvents } from '../../events/hooks/useEvents'
import { TeamBoardModal } from '../components/TeamBoardModal'
import { TeamStandings } from '../components/TeamStandings'
import { TilesMatrix } from '../components/TilesMatrix'
import { useRanking } from '../hooks/useScoring'
import type { Ranking } from '../types'

const MVP_COUNT = 5
const PERCENT = 100
const CELL = 'border-b border-rs-border/45 px-3 py-2.5 align-middle'
const HEAD =
  'whitespace-nowrap border-b border-rs-border bg-rs-inset px-3 py-2.5 text-left text-xs font-semibold text-rs-muted'

function Contributions({ ranking }: { ranking: Ranking }) {
  const { t, i18n } = useTranslation()
  const [teamId, setTeamId] = useState(ranking.teams[0]?.team_id ?? '')
  const format = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const players = ranking.players.filter((player) => player.team_id === teamId)
  const teamOf = new Map(ranking.teams.map((team) => [team.team_id, team]))
  const mvps = [...ranking.players]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, MVP_COUNT)
    .filter((player) => player.contribution > 0)
  const top = mvps[0]?.contribution ?? 0
  return (
    <section
      aria-label={t('ranking.contribution')}
      className="flex w-full flex-col gap-3 rounded border border-rs-border bg-rs-surface p-3.5"
    >
      <div>
        <h2 className="m-0 font-display text-lg text-rs-gold-bright">
          {t('ranking.contribution')}
        </h2>
        <span className="text-xs text-rs-muted">{t('ranking.contributionHint')}</span>
      </div>
      {mvps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 text-xs font-semibold uppercase tracking-[.12em] text-rs-gold">
            {t('dashboard.mvps')}
          </h3>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {mvps.map((player) => {
              const team = player.team_id ? teamOf.get(player.team_id) : undefined
              return (
                <li
                  key={player.player_id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-[13px]"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full border border-rs-border-strong"
                        style={{ backgroundColor: team?.team_color ?? undefined }}
                      />
                      <strong className="truncate">{player.display_name}</strong>
                      {team && (
                        <span className="truncate text-xs text-rs-muted">{team.team_name}</span>
                      )}
                    </span>
                    <span className="h-2 overflow-hidden rounded-r-[4px] bg-rs-inset">
                      <span
                        className="block h-full rounded-r-[4px] bg-rs-gold"
                        style={{ width: `${top > 0 ? (player.contribution / top) * PERCENT : 0}%` }}
                      />
                    </span>
                  </span>
                  <strong className="tabular-nums text-rs-gold-bright">
                    {format.format(player.contribution)}
                  </strong>
                </li>
              )
            })}
          </ol>
        </div>
      )}
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
  const [boardTeamId, setBoardTeamId] = useState<string | null>(null)
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
                onChange={(change) => {
                  setChosen(change.target.value)
                  setBoardTeamId(null)
                }}
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
            {/* Teams and matrix on the left, contribution beside them from the top (077). */}
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="m-0 font-display text-lg text-rs-gold-bright">
                    {t('ranking.official')}
                  </h2>
                  {ranking.data.teams.length === 0 ? (
                    <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
                      {t('ranking.noTeams')}
                    </p>
                  ) : (
                    <TeamStandings ranking={ranking.data} onOpenBoard={setBoardTeamId} />
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-rs-muted">
                    <InfoOutlinedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
                    {t('ranking.tiesNote')}
                  </span>
                </div>
                {ranking.data.teams.length > 0 && <TilesMatrix ranking={ranking.data} />}
              </div>
              <Contributions key={ranking.data.event_id} ranking={ranking.data} />
            </div>
          </>
        )}
      </div>
      {boardTeamId && ranking.data && (
        <TeamBoardModal
          eventId={ranking.data.event_id}
          teams={ranking.data.teams}
          initialTeamId={boardTeamId}
          onClose={() => setBoardTeamId(null)}
        />
      )}
    </AppShell>
  )
}
