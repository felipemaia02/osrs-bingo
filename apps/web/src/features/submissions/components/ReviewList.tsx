import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { TeamEmblem } from '../../teams/components/TeamEmblem'
import { useSubmissionTime } from '../hooks/useSubmissionTime'
import type { ReviewItem } from '../types'

interface ReviewListProps {
  items: ReviewItem[]
  selectedId: string | null
  onSelect: (item: ReviewItem) => void
}

/** Pending submissions, oldest first (future-review queue). */
export function ReviewList({ items, selectedId, onSelect }: ReviewListProps) {
  const { t } = useTranslation()
  const { ago } = useSubmissionTime()
  return (
    <ul aria-label={t('review.queue')} className="m-0 list-none p-0">
      {items.map((item) => {
        const selected = item.id === selectedId
        const preverification = item.kind === 'preverification'
        const Icon = preverification ? PhotoCameraOutlinedIcon : EditNoteOutlinedIcon
        return (
          <li key={item.id} className="border-b border-rs-border/45 last:border-b-0">
            <button
              type="button"
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(item)}
              className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left ${
                selected
                  ? 'bg-rs-raised shadow-[inset_3px_0_0_theme(colors.rs.gold-bright)]'
                  : 'hover:bg-rs-raised/50'
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <strong className="min-w-0 truncate">
                  {preverification ? t('review.initialScreenshot') : item.drop_name}
                </strong>
                <span className="shrink-0 text-xs text-rs-muted">{ago(item.submitted_at)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <TeamEmblem
                  team={{ name: item.team_name ?? '?', color: item.team_color }}
                  size="sm"
                />
                {item.player_name}
              </span>
              <span>
                <Badge tone={preverification ? 'info' : 'gold'}>
                  <Icon sx={{ fontSize: 13 }} aria-hidden="true" />
                  {preverification
                    ? t('review.preverificationOf', { card: item.card_name })
                    : item.card_name}
                </Badge>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
