import { useTranslation } from 'react-i18next'
import type { OwnTeamStatus } from '../../teams/hooks/useOwnTeamStatus'
import type { Team } from '../../teams/types'

const EMBLEM_LETTERS = 2

function emblemInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  return (words.length > 1 ? words.map((word) => word[0]).join('') : name)
    .slice(0, EMBLEM_LETTERS)
    .toUpperCase()
}

/** Team color with its initials (design: `tm-e`). */
export function TeamEmblem({ team, size }: { team: Team; size: 'sm' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[3px] font-bold text-rs-text ${
        team.color ? '' : 'bg-rs-raised'
      } ${size === 'lg' ? 'size-[34px] text-[13px]' : 'size-5 text-[9px]'}`}
      style={team.color ? { backgroundColor: team.color } : undefined}
    >
      {emblemInitials(team.name)}
    </span>
  )
}

/** "Saradomin" with the emblem, or the neutral registration message. */
export function TeamStatusValue({ status, size }: { status: OwnTeamStatus; size: 'sm' | 'lg' }) {
  const { t } = useTranslation()
  if (status.kind === 'hidden') return null
  if (status.kind !== 'team')
    return <span className="text-rs-muted">{t(`board.context.${status.kind}`)}</span>
  return (
    <span className="flex items-center gap-2 font-semibold">
      <TeamEmblem team={status.team} size={size} />
      {status.team.name}
    </span>
  )
}
