import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined'
import ViewStreamOutlinedIcon from '@mui/icons-material/ViewStreamOutlined'
import { useTranslation } from 'react-i18next'
import { Panel } from '../../../components/ui/Panel'
import { COL_BONUS_POINTS, ROW_BONUS_POINTS, type Tile } from '../data/tiles'

interface ScoreTallyProps {
  tiles: Tile[]
}

interface ScoreSummary {
  tilePoints: number
  completedCount: number
  completedRows: number
  completedCols: number
  rowBonus: number
  colBonus: number
  total: number
}

function isTileComplete(tile: Tile): boolean {
  return tile.progress >= tile.requirement
}

function countCompletedAxis(tiles: Tile[], axis: 'row' | 'col'): number {
  const axisSize = 6
  let count = 0
  for (let position = 1; position <= axisSize; position += 1) {
    const axisTiles = tiles.filter((tile) => tile[axis] === position)
    if (axisTiles.length === axisSize && axisTiles.every(isTileComplete)) count += 1
  }
  return count
}

function calculateScoreSummary(tiles: Tile[]): ScoreSummary {
  const completedTiles = tiles.filter(isTileComplete)
  const tilePoints = completedTiles.reduce((sum, tile) => sum + tile.points, 0)
  const completedRows = countCompletedAxis(tiles, 'row')
  const completedCols = countCompletedAxis(tiles, 'col')
  const rowBonus = completedRows * ROW_BONUS_POINTS
  const colBonus = completedCols * COL_BONUS_POINTS

  return {
    tilePoints,
    completedCount: completedTiles.length,
    completedRows,
    completedCols,
    rowBonus,
    colBonus,
    total: tilePoints + rowBonus + colBonus,
  }
}

export function ScoreTally({ tiles }: ScoreTallyProps) {
  const { t } = useTranslation()
  const score = calculateScoreSummary(tiles)

  return (
    <Panel as="aside" aria-labelledby="score-title" className="overflow-hidden xl:sticky xl:top-20">
      <div className="rs-texture border-b border-rs-border/60 bg-rs-raised px-4 py-4">
        <div className="mb-2 flex items-center gap-2 text-rs-gold">
          <EmojiEventsIcon fontSize="small" aria-hidden="true" />
          <h2 id="score-title" className="font-display text-sm font-bold text-rs-gold-bright">
            {t('score.title')}
          </h2>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-rs-muted">{t('score.total')}</span>
          <strong className="text-3xl font-semibold tabular-nums text-rs-gold-bright">
            {score.total}
          </strong>
        </div>
      </div>

      <div className="space-y-1 p-3">
        <ScoreRow
          icon={<GridViewOutlinedIcon fontSize="small" />}
          label={t('score.tiles')}
          value={score.tilePoints}
          detail={t('score.completedTiles', {
            completed: score.completedCount,
            total: tiles.length,
          })}
        />
        <ScoreRow
          icon={<ViewStreamOutlinedIcon fontSize="small" />}
          label={t('score.rowBonus')}
          value={score.rowBonus}
          detail={t('score.completedRows', { count: score.completedRows })}
        />
        <ScoreRow
          icon={<ViewColumnOutlinedIcon fontSize="small" />}
          label={t('score.columnBonus')}
          value={score.colBonus}
          detail={t('score.completedColumns', { count: score.completedCols })}
        />
      </div>
    </Panel>
  )
}

interface ScoreRowProps {
  icon: React.ReactNode
  label: string
  value: number
  detail: string
}

function ScoreRow({ icon, label, value, detail }: ScoreRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-rs-raised">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-rs-border/50 bg-rs-inset text-rs-muted"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-rs-text">{label}</p>
        <p className="truncate text-[11px] text-rs-muted">{detail}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums text-rs-gold-bright">{value}</span>
    </div>
  )
}
