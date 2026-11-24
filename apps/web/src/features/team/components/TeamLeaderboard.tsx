import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Panel } from '../../../components/ui/Panel'
import { usePointsFormat } from '../hooks/usePointsFormat'
import type { TeamMember } from '../types'

const PERCENT = 100

/** Members by their points in the team as bars (050 FR-003, 077 FR-003); ties share a place. */
export function TeamLeaderboard({ members }: { members: TeamMember[] }) {
  const { t } = useTranslation()
  const points = usePointsFormat()
  const top = Math.max(...members.map((member) => member.points), 0)
  const place = (member: TeamMember) =>
    `${t('ranking.place', { count: member.position, ordinal: true })}${
      member.tied ? ` ${t('ranking.tie')}` : ''
    }`
  return (
    <Panel as="section" aria-labelledby="team-leaderboard" className="flex flex-col gap-3 p-3.5">
      <div>
        <h2 id="team-leaderboard" className="m-0 font-display text-lg text-rs-gold-bright">
          {t('teamHome.leaderboard')}
        </h2>
        <span className="text-xs text-rs-muted">{t('teamHome.leaderboardHint')}</span>
      </div>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {members.map((member) => (
          <li
            key={member.player_id}
            title={t('dashboard.memberLine', {
              name: member.display_name,
              points: points(member.points),
              count: member.drop_count,
            })}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-2 text-[13px]"
          >
            <span className="text-xs font-semibold text-rs-muted">{place(member)}</span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <strong className="truncate">{member.display_name}</strong>
                {member.role === 'captain' && <Badge tone="gold">{t('teams.roles.captain')}</Badge>}
              </span>
              <span className="h-2 overflow-hidden rounded-r-[4px] bg-rs-inset">
                <span
                  className="block h-full rounded-r-[4px] bg-rs-gold"
                  style={{ width: `${top > 0 ? (member.points / top) * PERCENT : 0}%` }}
                />
              </span>
            </span>
            <span className="flex flex-col items-end">
              <strong className="tabular-nums text-rs-gold-bright">{points(member.points)}</strong>
              <span className="text-[11px] text-rs-muted">
                {t('dashboard.drops', { count: member.drop_count })}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
