import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import type { Tile, TileMatch } from '../types'
import { TileDetailContent } from './TileDetailContent'

/** The tile chosen on the mini-map, shown right below it (feature 025, FR-002). */
export function MobileTileDetail({
  tile,
  match,
  unavailableReason,
  onPrevious,
  onNext,
  onClose,
}: {
  tile: Tile
  match?: TileMatch
  unavailableReason: string
  onPrevious: (() => void) | null
  onNext: (() => void) | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const position = tile.bonus
    ? t('board.bonus.slot', { slot: tile.col })
    : t('board.panel.position', { row: tile.row, column: tile.col })
  return (
    <section
      aria-label={t('board.panel.label')}
      aria-live="polite"
      className="flex flex-col overflow-hidden rounded border border-rs-border bg-rs-surface"
    >
      <div className="flex items-center justify-between gap-2 border-b border-rs-border px-3 py-2">
        <Button
          size="icon"
          disabled={!onPrevious}
          onClick={onPrevious ?? undefined}
          aria-label={t('board.panel.previous')}
        >
          <ChevronLeftOutlinedIcon fontSize="small" aria-hidden="true" />
        </Button>
        <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold">
          {position}
        </span>
        <span className="flex gap-1.5">
          <Button
            size="icon"
            disabled={!onNext}
            onClick={onNext ?? undefined}
            aria-label={t('board.panel.next')}
          >
            <ChevronRightOutlinedIcon fontSize="small" aria-hidden="true" />
          </Button>
          <Button size="icon" onClick={onClose} aria-label={t('board.panel.closeTile')}>
            <CloseOutlinedIcon fontSize="small" aria-hidden="true" />
          </Button>
        </span>
      </div>
      <TileDetailContent tile={tile} match={match} showName unavailableReason={unavailableReason} />
    </section>
  )
}
