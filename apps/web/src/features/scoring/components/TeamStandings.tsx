import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import type { Ranking, RankingTeam } from '../types'

const PERCENT = 100

/** One card per team, best first: total, gap to the leader and progress (077 FR-005). */
export function TeamStandings({
  ranking,
  onOpenBoard,
}: {
  ranking: Ranking
  /** Opens the team's board (feature 058). */
  onOpenBoard: (teamId: string) => void
}) {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language)
  const leader = ranking.teams[0]?.total ?? 0
  const place = (team: RankingTeam) =>
    `${t('ranking.place', { count: team.position, ordinal: true })}${
      team.tied ? ` ${t('ranking.tie')}` : ''
    }`
  return (
    <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {ranking.teams.map((team) => {
        const gap = leader - team.total
        const share = leader > 0 ? (team.total / leader) * PERCENT : 0
        const pending = team.pending_submissions ?? 0
        return (
          <li
            key={team.team_id}
            aria-label={team.team_name}
            className={`flex flex-col gap-2.5 rounded border p-3.5 ${
              team.position === 1 ? 'border-rs-gold bg-rs-raised' : 'border-rs-border bg-rs-surface'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <TeamEmblem team={{ name: team.team_name, color: team.team_color }} size="md" />
                <span className="flex min-w-0 flex-col">
                  <strong className="truncate">{team.team_name}</strong>
                  <span className="text-xs text-rs-muted">
                    {t('ranking.members', { count: team.member_count })}
                  </span>
                </span>
              </span>
              <span className="flex flex-col items-end">
                <span className="text-xs font-semibold text-rs-gold">{place(team)}</span>
                <strong className="font-display text-2xl leading-none text-rs-gold-bright">
                  {number.format(team.total)}
                </strong>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div
                role="progressbar"
                aria-label={t('dashboard.vsLeader', { team: team.team_name })}
                aria-valuemin={0}
                aria-valuemax={PERCENT}
                aria-valuenow={Math.round(share)}
                className="h-2 overflow-hidden rounded-full bg-rs-inset"
              >
                <div className="h-full rounded-full bg-rs-gold" style={{ width: `${share}%` }} />
              </div>
              <span className="text-xs text-rs-muted">
                {leader === 0
                  ? t('dashboard.noPointsYet')
                  : gap > 0
                    ? t('dashboard.behindLeader', { points: number.format(gap) })
                    : t('dashboard.leading')}
              </span>
            </div>
            <dl className="m-0 grid grid-cols-3 gap-1.5 text-center">
              {[
                [t('score.tiles'), `${team.completed_tiles}/${ranking.tile_count}`],
                [t('score.rows'), `${team.completed_rows}/${ranking.size}`],
                [t('score.columns'), `${team.completed_columns}/${ranking.size}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[3px] border border-rs-border/60 bg-rs-inset py-1"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-[.08em] text-rs-muted">
                    {label}
                  </dt>
                  <dd className="m-0 text-sm font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  pending ? 'text-rs-gold-bright' : 'text-rs-muted'
                }`}
              >
                <RateReviewOutlinedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
                {t('dashboard.pendingReviews', { count: pending })}
              </span>
              <Button
                size="sm"
                onClick={() => onOpenBoard(team.team_id)}
                aria-label={t('ranking.board.openFor', { team: team.team_name })}
              >
                <GridViewOutlinedIcon fontSize="small" aria-hidden="true" />
                {t('ranking.board.open')}
              </Button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
