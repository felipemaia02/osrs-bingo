import { useTranslation } from 'react-i18next'
import type { OwnTeamStatus } from '../../teams/hooks/useOwnTeamStatus'
import { TeamEmblem } from '../../teams/components/TeamEmblem'

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
