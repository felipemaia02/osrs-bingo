import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import type { DraftCaptain } from '../../teams/types'

/** One card per team with its captain and the captain's EHB Σ (FR-002). */
export function CaptainStrip({ captains }: { captains: DraftCaptain[] }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  if (!captains.length) return null
  return (
    <ul
      aria-label={t('draft.captains')}
      className="m-0 grid list-none gap-3 p-0 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]"
    >
      {captains.map((team) => (
        <li
          key={team.team_id}
          className="flex items-center gap-2.5 rounded border border-rs-border/70 bg-rs-surface px-3 py-2.5"
        >
          <TeamEmblem team={{ name: team.team_name, color: team.color }} size="lg" />
          <span className="flex min-w-0 flex-col">
            {team.captain ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <strong className="truncate">{team.captain}</strong>
                <Badge tone="gold">{t('teams.roles.captain')}</Badge>
              </span>
            ) : (
              <span className="text-rs-muted">{t('draft.noCaptain')}</span>
            )}
            <span className="truncate text-xs text-rs-muted">
              {team.captain_ehb === null
                ? team.team_name
                : t('draft.captainLine', {
                    team: team.team_name,
                    ehb: format.hours(team.captain_ehb),
                  })}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
