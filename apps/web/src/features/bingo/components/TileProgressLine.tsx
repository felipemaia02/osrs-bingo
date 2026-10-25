import CheckCircle from '@mui/icons-material/CheckCircle'
import { useTranslation } from 'react-i18next'
import type { TileProgress } from '../types'

/** "6 / 8" with a bar, or "Complete +10" once the requirement is reached. */
export function TileProgressLine({ progress }: { progress: TileProgress }) {
  const { t } = useTranslation()
  if (progress.complete)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-rs-success-text">
        <CheckCircle sx={{ fontSize: 15 }} aria-hidden="true" />
        {t('score.tileComplete', { points: progress.points })}
      </span>
    )
  const percent = Math.min(100, (progress.value / progress.requirement) * 100)
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="h-1.5 flex-1 overflow-hidden rounded-[2px] bg-rs-inset" aria-hidden="true">
        <span className="block h-full bg-rs-gold" style={{ width: `${percent}%` }} />
      </span>
      <span className="tabular-nums text-rs-muted">
        {t('score.tileProgress', { value: progress.value, requirement: progress.requirement })}
      </span>
    </span>
  )
}
