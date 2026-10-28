import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { Player, RosterGroup } from '../types'

export interface RowHandlers {
  onApprove: (player: Player) => void
  onAssign: (player: Player) => void
  onRemove: (player: Player) => void
  onEdit: (player: Player) => void
}

export function RoleBadge({ player }: { player: Player }) {
  const { t } = useTranslation()
  if (!player.role) return <span className="text-rs-muted">—</span>
  return (
    <Badge tone={player.role === 'captain' ? 'gold' : 'info'}>
      {t(`teams.roles.${player.role}`)}
    </Badge>
  )
}

export function BuyInBadge({ player }: { player: Player }) {
  const { t } = useTranslation()
  if (!player.buy_in_status) return <span className="text-rs-muted">—</span>
  if (player.buy_in_status === 'pending')
    return (
      <Badge tone="gold">
        <ScheduleOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
        {t('teams.buyIn.pending')}
      </Badge>
    )
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Badge tone="success">
        <CheckOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
        {t('teams.buyIn.paid')}
      </Badge>
      {player.buy_in_admin_name && (
        <span className="text-xs text-rs-muted">
          {t('teams.buyIn.to', { name: player.buy_in_admin_name })}
        </span>
      )}
    </span>
  )
}

export function StatusBadge({ player }: { player: Player }) {
  const { t } = useTranslation()
  return player.status === 'pending' ? (
    <Badge tone="gold">{t('teams.status.pending')}</Badge>
  ) : (
    <Badge tone="success">{t('teams.status.approved')}</Badge>
  )
}

/** Approve (pending) or assign/change team (approved), plus remove. */
export function RowActions({
  player,
  group,
  busy,
  mobile,
  handlers,
  live = false,
}: {
  player: Player
  group: RosterGroup
  busy: boolean
  mobile: boolean
  handlers: RowHandlers
  /** Active event (feature 037): players on a team can't be moved or removed. */
  live?: boolean
}) {
  const { t } = useTranslation()
  const size = mobile ? 'md' : 'sm'
  const locked = live && group === 'assigned'
  return (
    <span className={`inline-flex gap-1.5 ${mobile ? 'w-full gap-2' : ''}`}>
      {group === 'pending' ? (
        <Button
          size={size}
          className={mobile ? 'flex-1' : ''}
          disabled={busy}
          aria-label={t('teams.approvePlayer', { name: player.display_name })}
          onClick={() => handlers.onApprove(player)}
        >
          {mobile && <CheckOutlinedIcon fontSize="small" aria-hidden="true" />}
          {t('teams.approve')}
        </Button>
      ) : locked ? null : (
        <Button
          size={size}
          className={mobile ? 'flex-1' : ''}
          disabled={busy}
          aria-label={t('teams.roster.assignPlayer', { name: player.display_name })}
          onClick={() => handlers.onAssign(player)}
        >
          {t(group === 'assigned' ? 'teams.roster.changeTeam' : 'teams.roster.assignTeam')}
        </Button>
      )}
      <Button
        size={mobile ? 'icon' : 'sm'}
        disabled={busy}
        aria-label={t('teams.participant.edit', { name: player.display_name })}
        title={t('teams.participant.edit', { name: player.display_name })}
        onClick={() => handlers.onEdit(player)}
      >
        <EditOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
      </Button>
      {!locked && (
        <Button
          size={mobile ? 'icon' : 'sm'}
          disabled={busy}
          aria-label={t('teams.removePlayer', { name: player.display_name })}
          title={t('teams.removePlayer', { name: player.display_name })}
          onClick={() => handlers.onRemove(player)}
        >
          <PersonRemoveOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        </Button>
      )}
    </span>
  )
}

/** Requested while the event was active (feature 037). */
export function LateJoinBadge({ player }: { player: Player }) {
  const { t } = useTranslation()
  if (!player.joined_late) return null
  return <Badge tone="info">{t('teams.lateJoin')}</Badge>
}
