import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { Player, RosterGroup } from '../types'

export interface RowHandlers {
  onApprove: (player: Player) => void
  onAssign: (player: Player) => void
  onRemove: (player: Player) => void
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
}: {
  player: Player
  group: RosterGroup
  busy: boolean
  mobile: boolean
  handlers: RowHandlers
}) {
  const { t } = useTranslation()
  const size = mobile ? 'md' : 'sm'
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
      ) : (
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
        aria-label={t('teams.removePlayer', { name: player.display_name })}
        title={t('teams.removePlayer', { name: player.display_name })}
        onClick={() => handlers.onRemove(player)}
      >
        <PersonRemoveOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
      </Button>
    </span>
  )
}
