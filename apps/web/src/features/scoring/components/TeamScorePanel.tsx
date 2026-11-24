import { useTranslation } from 'react-i18next'
import type { LineProgress, TeamScore } from '../types'

const PERCENT = 100

interface StatBlock {
  key: string
  label: string
  done: string
  points: string
}

function useStatBlocks(score: TeamScore): StatBlock[] {
  const { t } = useTranslation()
  const size = Math.round(Math.sqrt(score.tile_count))
  const points = (value: number | null, earned: number) =>
    value === null ? t('score.notConfiguredShort') : t('score.points', { count: earned })
  return [
    {
      key: 'tiles',
      label: t('score.tiles'),
      done: `${score.completed_tiles}/${score.tile_count}`,
      points: t('score.points', { count: score.tile_points }),
    },
    {
      key: 'rows',
      label: t('score.rows'),
      done: `${score.completed_rows.length}/${size}`,
      points: points(score.row_bonus, score.row_points),
    },
    {
      key: 'columns',
      label: t('score.columns'),
      done: `${score.completed_columns.length}/${size}`,
      points: points(score.column_bonus, score.column_points),
    },
    // Bonus row (feature 020), only when the board has one.
    ...(score.bonus_count > 0
      ? [
          {
            key: 'bonus',
            label: t('score.bonusShort'),
            done: `${score.completed_bonus}/${score.bonus_count}`,
            points: t('score.points', { count: score.bonus_points }),
          },
        ]
      : []),
  ]
}

function ClosestLines({ lines }: { lines: LineProgress[] }) {
  const { t } = useTranslation()
  if (!lines.length) return null
  return (
    <div className="flex flex-col gap-1">
      <h3 className="m-0 text-xs font-semibold uppercase tracking-[.12em] text-rs-gold">
        {t('score.closest')}
      </h3>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {lines.map((line) => (
          <li
            key={`${line.axis}-${line.line}`}
            className="rounded-[3px] border border-rs-border/60 bg-rs-inset px-2 py-1 text-xs"
          >
            <strong>{t(`score.line.${line.axis}`, { line: line.line })}</strong>
            {' — '}
            {t('score.lineTiles', { done: line.completed, total: line.total })}
            {line.bonus !== null && (
              <strong className="ml-1 text-rs-gold-bright">+{line.bonus}</strong>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Official score of the viewer's own team: total, maximum, breakdown and next bonuses (070). */
export function TeamScorePanel({
  score,
  compact = false,
}: {
  score: TeamScore
  compact?: boolean
}) {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language)
  const blocks = useStatBlocks(score)
  const max = score.max_total ?? 0
  const percent = max > 0 ? Math.min(PERCENT, Math.round((score.total / max) * PERCENT)) : 0
  return (
    <section
      aria-label={t('score.panel')}
      className={`flex flex-col gap-3 rounded border border-rs-border bg-rs-surface ${
        compact ? 'p-3' : 'px-4 py-3'
      }`}
    >
      <div className={`flex gap-3 ${compact ? 'flex-col' : 'flex-wrap items-center gap-x-6'}`}>
        <div className="flex items-center gap-3">
          {/* One chip in the team colour: an emblem beside the name repeated it (045). */}
          <strong
            className={`inline-flex min-h-[34px] max-w-[16rem] items-center truncate rounded-[3px] px-2.5 text-base text-rs-text ${
              score.team_color ? '' : 'bg-rs-raised'
            }`}
            style={score.team_color ? { backgroundColor: score.team_color } : undefined}
          >
            {score.team_name}
          </strong>
          <span className="flex items-baseline gap-1">
            <strong className="font-display text-[26px] leading-none text-rs-gold-bright">
              <span className="sr-only">{t('score.total')} </span>
              {number.format(score.total)}
            </strong>
            {max > 0 && (
              <span className="text-sm text-rs-muted">
                {t('score.ofMax', { max: number.format(max) })}
              </span>
            )}
          </span>
        </div>
        {max > 0 && (
          <div className="flex min-w-[140px] flex-1 items-center gap-2">
            <div
              role="progressbar"
              aria-label={t('score.progress')}
              aria-valuemin={0}
              aria-valuemax={PERCENT}
              aria-valuenow={percent}
              className="h-2 flex-1 overflow-hidden rounded-full border border-rs-border bg-rs-inset"
            >
              <div className="h-full bg-rs-gold" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs tabular-nums text-rs-muted">{percent}%</span>
          </div>
        )}
      </div>
      <dl className={`m-0 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        {blocks.map((block) => (
          <div
            key={block.key}
            className="flex flex-col rounded-[3px] border border-rs-border/60 bg-rs-inset px-2.5 py-1.5"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-[.1em] text-rs-muted">
              {block.label}
            </dt>
            <dd className="m-0 flex items-baseline justify-between gap-2">
              <strong className="text-base tabular-nums text-rs-text">{block.done}</strong>
              <span className="text-xs font-semibold tabular-nums text-rs-gold-bright">
                {block.points}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <ClosestLines lines={score.closest_lines ?? []} />
    </section>
  )
}
