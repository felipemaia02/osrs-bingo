import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useEventCountdown } from '../../events/hooks/useEventCountdown'
import type { BingoEvent } from '../../events/types'
import { BUTTON_LINK_CLASS } from './linkClasses'

/** One line for the running event: live, name, time left and the board (068 revision 1). */
export function ActiveEventStrip({ event }: { event: BingoEvent }) {
  const { t } = useTranslation()
  const { phase, duration } = useEventCountdown(event)
  const timeLeft =
    phase === 'upcoming'
      ? t('shell.event.startsIn', { time: duration })
      : phase === 'running'
        ? t('homePage.event.endsIn', { time: duration })
        : t('shell.event.ended')
  return (
    <section
      aria-label={t('homePage.event.live', { name: event.name })}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-rs-success bg-rs-surface px-4 py-3"
    >
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-rs-success-text">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-rs-success" />
        {t('homePage.event.liveBadge')}
      </span>
      <strong className="font-display text-lg text-rs-gold-bright">{event.name}</strong>
      <span className="text-sm text-rs-muted">{timeLeft}</span>
      <Link to="/board" className={`${BUTTON_LINK_CLASS} ml-auto`}>
        <GridViewOutlinedIcon fontSize="small" aria-hidden="true" />
        {t('homePage.event.openBoard')}
      </Link>
    </section>
  )
}

/** Shown when no event is running or open for registration. */
export function NoOpenEvent() {
  const { t } = useTranslation()
  return (
    <p className="m-0 rounded border border-rs-border bg-rs-surface px-4 py-3 text-sm text-rs-muted">
      {t('homePage.event.none')}
    </p>
  )
}
