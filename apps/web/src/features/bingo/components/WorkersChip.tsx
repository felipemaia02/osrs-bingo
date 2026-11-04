import Person from '@mui/icons-material/Person'
import PersonOutlined from '@mui/icons-material/PersonOutlined'
import type { TileWorker } from '../types'

/** Small "person + count" mark on a tile with teammates on it (feature 061). Filled when the
 * viewer is one of them. The tile's accessible name already lists the names. */
export function WorkersChip({
  workers,
  className = '',
}: {
  workers: TileWorker[]
  className?: string
}) {
  if (!workers.length) return null
  const Icon = workers.some((worker) => worker.is_you) ? Person : PersonOutlined
  return (
    <span
      aria-hidden="true"
      title={workers.map((worker) => worker.name).join(', ')}
      className={`inline-flex items-center gap-0.5 rounded-[2px] border border-rs-border-strong bg-rs-canvas/85 px-1 text-[11px] font-semibold leading-[18px] text-rs-gold-bright ${className}`}
    >
      <Icon sx={{ fontSize: 13 }} />
      {workers.length}
    </span>
  )
}
