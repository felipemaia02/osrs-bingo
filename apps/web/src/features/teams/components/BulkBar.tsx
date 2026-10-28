import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'

interface BulkBarProps {
  count: number
  canApprove: boolean
  busy: boolean
  onApprove: () => void
  /** Feature 038: assign every selected player to one team. */
  onAssign?: () => void
  onRemove: () => void
  onClear: () => void
}

/** Actions for the rows selected on the current page (teams-a-desktop bulk bar). */
export function BulkBar({
  count,
  canApprove,
  busy,
  onApprove,
  onAssign,
  onRemove,
  onClear,
}: BulkBarProps) {
  const { t } = useTranslation()
  return (
    <div
      role="region"
      aria-label={t('teams.bulk.label')}
      className="mx-3 mb-3 flex items-center gap-2.5 rounded-[3px] border border-rs-border-strong bg-rs-raised px-3 py-2"
    >
      <strong className="text-[13px]">{t('teams.bulk.selected', { count })}</strong>
      {canApprove && (
        <Button size="sm" onClick={onApprove} disabled={busy}>
          <CheckOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
          {t('teams.bulk.approve')}
        </Button>
      )}
      {onAssign && (
        <Button size="sm" onClick={onAssign} disabled={busy}>
          <GroupAddOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
          {t('teams.bulk.assign')}
        </Button>
      )}
      <Button size="sm" variant="danger" onClick={onRemove} disabled={busy}>
        <PersonRemoveOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        {t('teams.bulk.remove')}
      </Button>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear} disabled={busy}>
        {t('teams.bulk.clear')}
      </Button>
    </div>
  )
}
