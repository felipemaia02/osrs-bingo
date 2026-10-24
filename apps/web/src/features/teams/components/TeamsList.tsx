import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import type { Team } from '../types'
import { TeamEmblem } from './TeamEmblem'

interface TeamsListProps {
  teams: Team[]
  mobile: boolean
  onViewMembers: (team: Team) => void
  /** Draft events only: rename the team. */
  onEdit?: (team: Team) => void
}

/** Teams tab: emblem, name, member count and a link to the filtered Assigned tab. */
export function TeamsList({ teams, mobile, onViewMembers, onEdit }: TeamsListProps) {
  const { t } = useTranslation()
  const view = (team: Team) => (
    <Button
      size={mobile ? 'md' : 'sm'}
      className={mobile ? 'w-full' : ''}
      aria-label={t('teams.roster.viewMembers', { name: team.name })}
      onClick={() => onViewMembers(team)}
    >
      {t('teams.roster.viewMembersShort')}
    </Button>
  )
  const edit = (team: Team) =>
    onEdit && (
      <Button
        size={mobile ? 'md' : 'sm'}
        className={mobile ? 'w-full' : ''}
        aria-label={t('teams.editTeam', { name: team.name })}
        onClick={() => onEdit(team)}
      >
        <EditOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        {t('teams.edit')}
      </Button>
    )
  if (mobile) {
    return (
      <div className="flex flex-col gap-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex flex-col gap-2.5 rounded border border-rs-border bg-rs-surface p-3"
          >
            <div className="flex items-center gap-2">
              <TeamEmblem team={team} size="lg" />
              <div>
                <strong>{team.name}</strong>
                <br />
                <span className="text-xs text-rs-muted">
                  {t('teams.memberCount', { count: team.member_count })}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {edit(team)}
              {view(team)}
            </div>
          </div>
        ))}
      </div>
    )
  }
  const head =
    'border-b border-rs-border bg-rs-inset px-3 py-2.5 text-left text-xs font-semibold text-rs-muted'
  const cell = 'border-b border-rs-border/45 px-3 py-2.5'
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={head}>{t('teams.roster.team')}</th>
          <th className={head}>{t('teams.roster.members')}</th>
          <th className={`${head} text-right`}>{t('teams.roster.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((team) => (
          <tr key={team.id}>
            <td className={cell}>
              <span className="inline-flex items-center gap-2 font-semibold">
                <TeamEmblem team={team} size="md" />
                {team.name}
              </span>
            </td>
            <td className={cell}>{t('teams.memberCount', { count: team.member_count })}</td>
            <td className={`${cell} text-right`}>
              <span className="inline-flex gap-1.5">
                {edit(team)}
                {view(team)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
