import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Panel } from '../../../components/ui/Panel'
import { usePointsFormat } from '../hooks/usePointsFormat'
import type { TeamMember } from '../types'
import { CELL, HEAD } from './teamTable'

/** The team's members ordered by their points in it (FR-003); ties share a place. */
export function TeamLeaderboard({ members }: { members: TeamMember[] }) {
  const { t } = useTranslation()
  const points = usePointsFormat()
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
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={HEAD}>{t('teamHome.place')}</th>
            <th className={HEAD}>{t('ranking.player')}</th>
            <th className={`${HEAD} text-right`}>{t('teamHome.drops')}</th>
            <th className={`${HEAD} text-right`}>{t('teamHome.points')}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.player_id}>
              <td className={`${CELL} whitespace-nowrap text-xs font-semibold`}>{place(member)}</td>
              <td className={CELL}>
                <span className="flex flex-wrap items-center gap-1.5">
                  {member.display_name}
                  {member.role === 'captain' && (
                    <Badge tone="gold">{t('teams.roles.captain')}</Badge>
                  )}
                </span>
              </td>
              <td className={`${CELL} text-right tabular-nums`}>{member.drop_count}</td>
              <td className={`${CELL} text-right font-semibold tabular-nums text-rs-gold-bright`}>
                {points(member.points)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
