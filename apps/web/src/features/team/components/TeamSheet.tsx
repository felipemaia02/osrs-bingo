import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Panel } from '../../../components/ui/Panel'
import { zoneLabel } from '../../profiles/timezones'
import type { TeamMember } from '../types'
import { CELL, HEAD } from './teamTable'

const byName = (a: TeamMember, b: TeamMember) =>
  a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' })

/** Every member with Discord name, role, time zone and activity (FR-005); no buy-in. */
export function TeamSheet({ members }: { members: TeamMember[] }) {
  const { t } = useTranslation()
  const sorted = [...members].sort(byName)
  return (
    <Panel as="section" aria-labelledby="team-sheet" className="flex flex-col gap-3 p-3.5">
      <h2 id="team-sheet" className="m-0 font-display text-lg text-rs-gold-bright">
        {t('teamHome.sheet', { count: members.length })}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={HEAD}>{t('teamHome.rsn')}</th>
              <th className={HEAD}>{t('teamHome.discord')}</th>
              <th className={HEAD}>{t('teamHome.timezone')}</th>
              <th className={HEAD}>{t('teamHome.activity')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((member) => (
              <tr key={member.player_id}>
                <td className={CELL}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <strong className="text-rs-text">{member.display_name}</strong>
                    {member.role && (
                      <Badge tone={member.role === 'captain' ? 'gold' : 'info'}>
                        {t(`teams.roles.${member.role}`)}
                      </Badge>
                    )}
                  </span>
                </td>
                <td className={`${CELL} text-rs-muted`}>{member.discord_username ?? '—'}</td>
                <td className={`${CELL} whitespace-nowrap`}>
                  {member.timezone ? zoneLabel(member.timezone) : '—'}
                </td>
                <td className={`${CELL} whitespace-nowrap`}>
                  {member.activity ? t(`join.activity.short.${member.activity}`) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
