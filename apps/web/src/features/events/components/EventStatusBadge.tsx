import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '../../../components/ui/Badge'
import type { EventStatus } from '../types'

const STATUS_TONE: Record<EventStatus, BadgeTone> = {
  draft: 'gold',
  active: 'success',
  finished: 'neutral',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { t } = useTranslation()
  return <Badge tone={STATUS_TONE[status]}>{t(`events.status.${status}`)}</Badge>
}
