import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { CardDifficulty } from '../../cards/types'
import { TIER_TONE } from '../../bingo/tierTone'
import { BOARD_SIZE } from '../draft'

const TIERS: CardDifficulty[] = ['Low', 'Mid', 'High']

interface BuilderStatusPanelProps {
  editable: boolean
  filled: number
  tierCounts: Record<CardDifficulty, number>
  fillCount: number
  dirty: boolean
  saving: boolean
  onFill: () => void
  onClear: () => void
  onSave: () => void
}

/** State, fill progress, difficulty balance and board actions (boards-a-desktop). */
export function BuilderStatusPanel({
  editable,
  filled,
  tierCounts,
  fillCount,
  dirty,
  saving,
  onFill,
  onClear,
  onSave,
}: BuilderStatusPanelProps) {
  const { t } = useTranslation()
  const empty = BOARD_SIZE - filled
  return (
    <div className="flex flex-wrap items-center gap-[18px] rounded border border-rs-border bg-rs-surface px-3.5 py-2.5">
      <Badge tone="neutral" className="text-xs">
        {editable ? (
          <EditNoteOutlinedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
        ) : (
          <LockOutlinedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
        )}
        {t(editable ? 'boards.state.editable' : 'boards.state.readOnly')}
      </Badge>
      <div className="flex flex-col gap-1">
        <span className="text-[13px]">
          <strong>{t('boards.filledOf', { filled, total: BOARD_SIZE })}</strong>{' '}
          <span className="text-rs-muted">{t('boards.filledDetail', { count: empty })}</span>
        </span>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={BOARD_SIZE}
          aria-valuenow={filled}
          aria-label={t('boards.filledOf', { filled, total: BOARD_SIZE })}
          className="h-1.5 w-60 overflow-hidden rounded-[2px] bg-rs-inset"
        >
          <div className="h-full bg-rs-gold" style={{ width: `${(filled / BOARD_SIZE) * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-rs-muted">{t('boards.difficulty')}</span>
        {TIERS.map((tier) => (
          <Badge key={tier} tone={TIER_TONE[tier]}>
            {t(`tile.tier.${tier}`)} {tierCounts[tier]}
          </Badge>
        ))}
      </div>
      {editable && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {dirty && <Badge tone="gold">{t('boards.unsaved')}</Badge>}
          <Button onClick={onFill} disabled={saving || fillCount === 0}>
            <PlaylistAddOutlinedIcon fontSize="small" aria-hidden="true" />
            {t('boards.fillEmpty', { count: fillCount })}
          </Button>
          <Button variant="danger" onClick={onClear} disabled={saving || filled === 0}>
            <DeleteSweepOutlinedIcon fontSize="small" aria-hidden="true" />
            {t('boards.clear')}
          </Button>
          <Button variant="primary" onClick={onSave} disabled={saving || !dirty}>
            <SaveOutlinedIcon fontSize="small" aria-hidden="true" />
            {t(saving ? 'common.saving' : 'boards.save')}
          </Button>
        </div>
      )}
    </div>
  )
}
