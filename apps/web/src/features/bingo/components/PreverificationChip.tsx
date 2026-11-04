import HourglassTopOutlined from '@mui/icons-material/HourglassTopOutlined'
import VerifiedUser from '@mui/icons-material/VerifiedUser'
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined'
import { useTranslation } from 'react-i18next'
import type { PreverificationState } from '../types'

const LOOK: Record<PreverificationState, { icon: typeof VerifiedUser; tone: string }> = {
  needed: { icon: VerifiedUserOutlined, tone: 'border-rs-gold text-rs-gold-bright' },
  pending: { icon: HourglassTopOutlined, tone: 'border-rs-info text-rs-info-text' },
  accepted: { icon: VerifiedUser, tone: 'border-rs-success text-rs-success-text' },
}

/** The viewer's pre-verification on a tile (feature 062): to send, waiting, or verified. */
export function PreverificationChip({
  state,
  className = '',
}: {
  state: PreverificationState
  className?: string
}) {
  const { t } = useTranslation()
  const { icon: Icon, tone } = LOOK[state]
  const label = t(`preverification.state.${state}`)
  return (
    <span
      title={label}
      aria-hidden="true"
      className={`inline-flex size-5 items-center justify-center rounded-[2px] border bg-rs-canvas/85 ${tone} ${className}`}
    >
      <Icon sx={{ fontSize: 13 }} />
    </span>
  )
}
