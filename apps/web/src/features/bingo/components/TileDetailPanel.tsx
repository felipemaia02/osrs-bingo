import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined'
import { useTranslation } from 'react-i18next'
import type { Tile, TileMatch } from '../types'
import { TileDetailContent } from './TileDetailContent'

interface TileDetailPanelProps {
  tile: Tile | null
  match?: TileMatch
  unavailableReason: string
  onClose: () => void
}

/** Fixed desktop panel beside the grid; shows a prompt until a tile is selected. */
export function TileDetailPanel({ tile, match, unavailableReason, onClose }: TileDetailPanelProps) {
  const { t } = useTranslation()
  return (
    <aside
      aria-label={t('board.panel.label')}
      className="sticky top-[84px] flex w-[340px] shrink-0 flex-col overflow-hidden rounded border border-rs-border bg-rs-surface"
    >
      {tile ? (
        <>
          <div className="flex items-center justify-between border-b border-rs-border px-3.5 py-3">
            <h2 className="m-0 min-w-0 font-display text-[20px] leading-tight text-rs-gold-bright">
              {tile.name}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('board.panel.close')}
              title={t('board.panel.close')}
              className="inline-flex size-8 items-center justify-center rounded-[3px] border border-rs-border bg-rs-surface text-rs-text"
            >
              <CloseOutlinedIcon fontSize="small" aria-hidden="true" />
            </button>
          </div>
          <TileDetailContent tile={tile} match={match} unavailableReason={unavailableReason} />
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-rs-muted">
          <TouchAppOutlinedIcon className="text-rs-gold" aria-hidden="true" />
          <span>{t('board.panel.prompt')}</span>
        </div>
      )}
    </aside>
  )
}
