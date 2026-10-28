import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { useTileHistory } from '../hooks/useSubmissions'
import { useSubmissionTime } from '../hooks/useSubmissionTime'
import type { ReviewItem } from '../types'
import { Screenshot, SourceBadge, SubmissionStatusBadge } from './SubmissionParts'

/**
 * What the submission's team already has on this tile (feature 035): progress plus the accepted
 * and pending drops, so reviewers spot repeats. Same item highlighted, likely duplicates flagged.
 */
export function TileHistoryPanel({ item }: { item: ReviewItem }) {
  const { t } = useTranslation()
  const { when } = useSubmissionTime()
  const history = useTileHistory(item.kind === 'drop' ? item.id : null)
  if (item.kind !== 'drop') return null
  const data = history.data
  return (
    <section
      aria-label={t('review.history.title', { team: item.team_name ?? '—' })}
      className="flex flex-col gap-2 border-t border-rs-border px-4 py-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-[13px] font-semibold">
          {t('review.history.title', { team: item.team_name ?? '—' })}
        </h3>
        {data && (
          <span className="flex items-center gap-1.5 text-[13px]">
            {t('review.history.progress', {
              progress: data.progress,
              requirement: data.requirement,
            })}
            {data.complete && <Badge tone="success">{t('review.history.complete')}</Badge>}
          </span>
        )}
      </div>
      {history.isLoading ? (
        <p className="m-0 text-xs text-rs-muted">{t('common.loading')}</p>
      ) : history.isError || !data ? (
        <p className="m-0 text-xs text-rs-muted">{t('common.apiError')}</p>
      ) : !data.items.length ? (
        <p className="m-0 text-xs text-rs-muted">{t('review.history.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {data.items.map((entry) => (
            <li
              key={entry.id}
              className={`flex items-center gap-2.5 rounded-[3px] border p-1.5 text-[13px] ${
                entry.possible_duplicate
                  ? 'border-rs-danger/70 bg-rs-danger-bg'
                  : entry.same_item
                    ? 'border-rs-border-strong bg-rs-warning-bg'
                    : 'border-rs-border/50'
              }`}
            >
              <Screenshot
                submission={{ ...item, id: entry.id, has_screenshot: entry.has_screenshot }}
                className="size-12 shrink-0"
                compact
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">
                  <strong>{entry.drop_name}</strong>{' '}
                  <span className="text-rs-muted">
                    · {t('cards.rules.progress', { count: entry.progress_weight ?? 0 })}
                  </span>
                </span>
                <span className="text-xs text-rs-muted">
                  {entry.player_name} · {when(entry.submitted_at)}
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                {entry.possible_duplicate && (
                  <Badge tone="danger">
                    <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
                    {t('review.duplicate.badge')}
                  </Badge>
                )}
                <SourceBadge submission={{ ...item, source: entry.source }} />
                {entry.status === 'pending' && <SubmissionStatusBadge status="pending" />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
