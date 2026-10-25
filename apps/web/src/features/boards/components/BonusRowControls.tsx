import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined'
import StarOutlinedIcon from '@mui/icons-material/StarOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'

interface BonusRowControlsProps {
  slots: number
  max: number
  editable: boolean
  onChange: (slots: number) => void
}

/** Add, resize (1…size) or remove the bonus row under the grid (feature 020). */
export function BonusRowControls({ slots, max, editable, onChange }: BonusRowControlsProps) {
  const { t } = useTranslation()
  if (!editable) return null
  if (slots === 0)
    return (
      <button
        type="button"
        onClick={() => onChange(1)}
        className="flex min-h-11 items-center justify-center gap-2 rounded border border-dashed border-rs-gold bg-rs-inset text-sm text-rs-gold-bright md:min-h-10"
      >
        <StarOutlinedIcon fontSize="small" aria-hidden="true" />
        {t('boards.bonusRow.add')}
      </button>
    )
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-rs-muted">{t('boards.bonusRow.slots', { count: slots })}</span>
      <Button
        size="sm"
        aria-label={t('boards.bonusRow.fewer')}
        disabled={slots <= 1}
        onClick={() => onChange(slots - 1)}
      >
        <RemoveOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
      </Button>
      <Button
        size="sm"
        aria-label={t('boards.bonusRow.more')}
        disabled={slots >= max}
        onClick={() => onChange(slots + 1)}
      >
        <AddOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
      </Button>
      <Button size="sm" variant="danger" onClick={() => onChange(0)}>
        {t('boards.bonusRow.remove')}
      </Button>
    </div>
  )
}
