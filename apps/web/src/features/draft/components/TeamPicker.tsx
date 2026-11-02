import { useTranslation } from 'react-i18next'
import type { DraftCaptain } from '../../teams/types'

// Mobile keeps 16 px so iOS doesn't zoom on focus.
const NO_TEAM = ''

/** Small team dropdown on a card or roster row (049, FR-004): the keyboard and touch path. */
export function TeamPicker({
  name,
  teamId,
  teams,
  disabled,
  onPick,
}: {
  name: string
  teamId: string | null
  teams: DraftCaptain[]
  disabled?: boolean
  onPick: (teamId: string | null) => void
}) {
  const { t } = useTranslation()
  if (!teams.length) return null
  return (
    <select
      aria-label={t('draft.pick.moveTo', { name })}
      value={teamId ?? NO_TEAM}
      disabled={disabled}
      onChange={(change) => onPick(change.target.value || null)}
      onClick={(click) => click.stopPropagation()}
      className="min-h-9 max-w-[9.5rem] rounded-[3px] border border-rs-border bg-rs-inset px-2 text-base text-rs-text md:min-h-8 md:text-xs"
    >
      <option value={NO_TEAM}>{teamId ? t('draft.pick.noTeam') : t('draft.pick.choose')}</option>
      {teams.map((team) => (
        <option key={team.team_id} value={team.team_id}>
          {team.team_name}
        </option>
      ))}
    </select>
  )
}
