import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import type { BingoEvent } from '../types'

export type EventTransition = 'activate' | 'finish'

interface EventActionsProps {
  event: BingoEvent
  mobile: boolean
  onEdit: (event: BingoEvent) => void
  onRules: (event: BingoEvent) => void
  onTransition: (event: BingoEvent, action: EventTransition) => void
}

const ICON = { fontSize: 18 }

/** Actions allowed by the event status (feature 002): drafts edit/board/activate, active finishes. */
export function EventActions({ event, mobile, onEdit, onRules, onTransition }: EventActionsProps) {
  const { t } = useTranslation()
  const size = mobile ? 'md' : 'sm'
  const grow = mobile ? 'flex-1' : ''
  const named = (label: string) => t(label) + ' · ' + event.name

  if (event.status === 'finished')
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-rs-muted">
        <LockOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
        {t('events.readOnly')}
      </span>
    )
  if (event.status === 'active')
    return (
      <div className={`flex flex-wrap items-center gap-2 ${mobile ? '' : 'justify-end'}`}>
        <Button
          size={size}
          className={grow}
          aria-label={named('events.actions.rules')}
          onClick={() => onRules(event)}
        >
          <RuleOutlinedIcon sx={ICON} aria-hidden="true" />
          {t('events.actions.rules')}
        </Button>
        <Button
          variant="danger"
          size={size}
          className={grow}
          aria-label={named('events.actions.finish')}
          onClick={() => onTransition(event, 'finish')}
        >
          <CheckCircleOutlinedIcon sx={ICON} aria-hidden="true" />
          {t('events.actions.finish')}
        </Button>
      </div>
    )
  const linkSize = mobile ? 'min-h-11 px-3.5 text-sm' : 'min-h-[34px] px-2.5 text-[13px]'
  return (
    <div className={`flex flex-wrap items-center gap-2 ${mobile ? '' : 'justify-end'}`}>
      <Button
        size={size}
        className={grow}
        aria-label={named('events.actions.edit')}
        onClick={() => onEdit(event)}
      >
        <EditOutlinedIcon sx={ICON} aria-hidden="true" />
        {t('events.actions.edit')}
      </Button>
      <Link
        to={`/admin/boards?event=${encodeURIComponent(event.id)}`}
        aria-label={named('events.actions.board')}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] border border-rs-border bg-rs-surface text-rs-text hover:border-rs-border-strong ${linkSize} ${grow}`}
      >
        <GridViewOutlinedIcon sx={ICON} aria-hidden="true" />
        {t('events.actions.board')}
      </Link>
      <Button
        size={size}
        className={grow}
        aria-label={named('events.actions.rules')}
        onClick={() => onRules(event)}
      >
        <RuleOutlinedIcon sx={ICON} aria-hidden="true" />
        {t('events.actions.rules')}
      </Button>
      <Button
        variant="primary"
        size={size}
        className={grow}
        aria-label={named('events.actions.activate')}
        onClick={() => onTransition(event, 'activate')}
      >
        <PlayArrowIcon sx={ICON} aria-hidden="true" />
        {t('events.actions.activateShort')}
      </Button>
    </div>
  )
}
