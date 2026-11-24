import type { CSSProperties } from 'react'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Panel } from '../../../components/ui/Panel'
import type { Tile } from '../../bingo/types'
import { ProgressLegend } from '../../scoring/components/ProgressLegend'
import { progressShade } from '../../scoring/progressShade'

function Square({ tile, style }: { tile: Tile; style?: CSSProperties }) {
  const { t } = useTranslation()
  const value = tile.progress?.value ?? 0
  const complete = tile.progress?.complete ?? false
  const label = complete
    ? t('dashboard.squareDone', { name: tile.name })
    : t('dashboard.squareProgress', { name: tile.name, value, requirement: tile.requirement })
  return (
    <li
      title={label}
      style={style}
      className={`flex aspect-square items-center justify-center rounded-[3px] border text-xs font-semibold ${progressShade(
        value,
        tile.requirement,
        complete,
      )}`}
    >
      <span aria-hidden="true">{complete ? '✓' : ''}</span>
      <span className="sr-only">{label}</span>
    </li>
  )
}

/** The team's board at a glance: one square per tile shaded by progress (077 FR-001). */
export function BoardHeatmap({
  tiles,
  size,
  completedRows,
  completedColumns,
}: {
  tiles: Tile[]
  size: number
  completedRows: number[]
  completedColumns: number[]
}) {
  const { t } = useTranslation()
  const grid = tiles.filter((tile) => !tile.bonus).sort((a, b) => a.position - b.position)
  const bonus = tiles.filter((tile) => tile.bonus).sort((a, b) => a.col - b.col)
  const columns = { gridTemplateColumns: `1.25rem repeat(${size}, minmax(0, 1fr))` }
  const lines = Array.from({ length: size }, (_, index) => index + 1)
  const axis = (done: boolean) =>
    `text-center text-[11px] font-semibold ${done ? 'text-rs-success-text' : 'text-rs-muted'}`
  return (
    <Panel as="section" aria-labelledby="team-map" className="flex flex-col gap-3 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="team-map" className="m-0 font-display text-lg text-rs-gold-bright">
          {t('dashboard.mapTitle')}
        </h2>
        <Link
          to="/board"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-rs-gold-bright"
        >
          <GridViewOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {t('homePage.event.openBoard')}
        </Link>
      </div>
      <div className="grid gap-1" style={columns} aria-hidden="true">
        <span />
        {lines.map((column) => (
          <span key={column} className={axis(completedColumns.includes(column))}>
            {completedColumns.includes(column) ? '✓' : column}
          </span>
        ))}
      </div>
      <div className="grid gap-1" style={columns}>
        <ol aria-hidden="true" className="contents">
          {lines.map((row) => (
            <li
              key={row}
              className={`${axis(completedRows.includes(row))} self-center`}
              style={{ gridColumn: 1, gridRow: row }}
            >
              {completedRows.includes(row) ? '✓' : row}
            </li>
          ))}
        </ol>
        <ul aria-label={t('dashboard.mapLabel')} className="contents">
          {grid.map((tile) => (
            <Square
              key={tile.id}
              tile={tile}
              style={{ gridColumn: tile.col + 1, gridRow: tile.row }}
            />
          ))}
        </ul>
      </div>
      {bonus.length > 0 && (
        <ul
          aria-label={t('board.bonus.row')}
          className="m-0 grid list-none gap-1 p-0"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {bonus.map((tile) => (
            <Square key={tile.id} tile={tile} />
          ))}
        </ul>
      )}
      <ProgressLegend />
    </Panel>
  )
}
