import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import { useTranslation } from 'react-i18next'
import { Panel } from '../../../components/ui/Panel'
import { MOCK_TILES } from '../data/tiles'
import { ScoreTally } from './ScoreTally'
import { TileCard } from './TileCard'

const GRID_SIZE = 6
const GRID_POSITIONS = Array.from({ length: GRID_SIZE }, (_, index) => index + 1)

function wikiImageUrl(wikiPage: string): string {
  return `https://oldschool.runescape.wiki/w/Special:FilePath/${wikiPage.replace(/ /g, '_')}.png`
}

export function BingoBoard() {
  const { t } = useTranslation()

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_16rem] xl:items-start">
      <Panel as="section" aria-labelledby="board-grid-title" className="min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-rs-border/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <GridViewOutlinedIcon className="text-rs-gold" fontSize="small" aria-hidden="true" />
            <h2
              id="board-grid-title"
              className="font-display text-sm font-bold text-rs-gold-bright"
            >
              {t('board.gridTitle')}
            </h2>
          </div>
          <span className="text-xs text-rs-muted">
            {t('board.tileCount', { count: MOCK_TILES.length })}
          </span>
        </div>

        <p className="border-b border-rs-border/40 bg-rs-inset/50 px-4 py-2 text-xs text-rs-muted sm:hidden">
          {t('board.scrollHint')}
        </p>

        <div
          className="overflow-x-auto p-3 sm:p-4"
          tabIndex={0}
          aria-label={t('board.scrollRegion')}
        >
          <div className="grid min-w-[62rem] grid-cols-6 gap-2 lg:min-w-0">
            {GRID_POSITIONS.flatMap((row) =>
              GRID_POSITIONS.map((col) => {
                const tile = MOCK_TILES.find((item) => item.row === row && item.col === col)
                if (!tile) return null
                const imageUrl = tile.wikiPage ? wikiImageUrl(tile.wikiPage) : null
                return <TileCard key={tile.id} tile={tile} imageUrl={imageUrl} />
              }),
            )}
          </div>
        </div>
      </Panel>

      <ScoreTally tiles={MOCK_TILES} />
    </div>
  )
}
