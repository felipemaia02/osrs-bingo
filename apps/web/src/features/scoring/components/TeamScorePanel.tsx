import { useTranslation } from 'react-i18next'
import type { TeamScore } from '../types'

/** Official score of the viewer's own team (future-board, without special bonuses). */
export function TeamScorePanel({
  score,
  compact = false,
}: {
  score: TeamScore
  compact?: boolean
}) {
  const { t } = useTranslation()
  const line = (count: number, value: number | null) =>
    value === null ? t('score.notConfigured') : t('score.lineBreakdown', { count, value })
  const items = [
    {
      label: t('score.completedTiles', { count: score.completed_tiles, total: score.tile_count }),
      points: score.tile_points,
    },
    {
      label: `${t('score.rows')} · ${line(score.completed_rows.length, score.row_bonus)}`,
      points: score.row_points,
    },
    {
      label: `${t('score.columns')} · ${line(score.completed_columns.length, score.column_bonus)}`,
      points: score.column_points,
    },
    // Bonus row (feature 020), only when the board has one.
    ...(score.bonus_count > 0
      ? [
          {
            label: t('score.bonusCards', {
              count: score.completed_bonus,
              total: score.bonus_count,
            }),
            points: score.bonus_points,
          },
        ]
      : []),
  ]
  return (
    <section
      aria-label={t('score.panel')}
      className={`flex rounded border border-rs-border bg-rs-surface ${
        compact ? 'flex-col gap-2 p-3' : 'items-center gap-6 px-4 py-3'
      }`}
    >
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
        <strong className="font-display text-[26px] leading-none text-rs-gold-bright">
          <span className="sr-only">{t('score.total')} </span>
          {score.total}
        </strong>
      </div>
      <dl
        className={`m-0 grid gap-x-6 gap-y-1 text-[13px] ${compact ? 'grid-cols-[1fr_auto]' : 'flex-1 grid-cols-[repeat(4,auto_auto)] justify-start'}`}
      >
        {items.map((item) => (
          <div key={item.label} className="contents">
            <dt className="text-rs-muted">{item.label}</dt>
            <dd className="m-0 text-right font-semibold tabular-nums">{item.points}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
