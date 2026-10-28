import { canJoin } from '../../events/rules'
import type { ReactNode } from 'react'
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, type BadgeTone } from '../../../components/ui/Badge'
import { useSession } from '../../auth/hooks/useSession'
import type { BingoEvent } from '../../events/types'
import { useOwnRegistration, useTeams } from '../hooks/useTeams'
import type { Player } from '../types'

const STATUS_TONE: Record<Player['status'], BadgeTone> = {
  pending: 'gold',
  approved: 'success',
  removed: 'danger',
}

function Section({ children }: { children: ReactNode }) {
  return <div className="mt-1 border-t border-rs-border/45 pt-3 text-sm">{children}</div>
}

/** The player's own registration for one event (feature 003), shown on the events page. */
export function EventRegistration({ event }: { event: BingoEvent }) {
  const { t } = useTranslation()
  const session = useSession()
  const registration = useOwnRegistration(event.id, session.data?.id)
  const teams = useTeams(registration.data?.team_id ? event.id : null)

  if (session.isLoading || registration.isLoading)
    return (
      <Section>
        <p className="m-0 text-rs-muted">{t('common.loading')}</p>
      </Section>
    )
  if (session.isError || registration.isError)
    return (
      <Section>
        <p role="alert" className="m-0 text-rs-muted">
          {t('common.apiError')}
        </p>
      </Section>
    )
  if (!session.data)
    return canJoin(event) ? (
      <Section>
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center gap-1.5 text-rs-gold-bright hover:text-rs-gold-hover md:min-h-0"
        >
          <LoginOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
          {t('registration.loginToRegister')}
        </Link>
      </Section>
    ) : null
  const own = registration.data
  if (own) {
    const teamName = own.team_id
      ? (teams.data?.find((team) => team.id === own.team_id)?.name ??
        t(teams.isError ? 'common.apiError' : 'common.loading'))
      : t('teams.unassigned')
    return (
      <Section>
        <div className="flex flex-wrap items-center gap-2" role="status">
          <span className="text-rs-muted">{t('registration.yours')}</span>
          <Badge tone={STATUS_TONE[own.status]}>{t(`registration.badge.${own.status}`)}</Badge>
          {own.account_id ? (
            <span>
              {t('registration.playingAs')} <strong>{own.display_name}</strong>
            </span>
          ) : (
            <strong>{own.display_name}</strong>
          )}
          {own.status === 'approved' && <span className="text-rs-muted">· {teamName}</span>}
          {own.buy_in_status && (
            <Badge tone={own.buy_in_status === 'paid' ? 'success' : 'gold'}>
              {t(`registration.buyIn.${own.buy_in_status}`)}
            </Badge>
          )}
        </div>
        {own.status !== 'approved' && (
          <p className="mb-0 mt-1 text-xs text-rs-muted">
            {t(`registration.status.${own.status}`)}
          </p>
        )}
      </Section>
    )
  }
  if (!canJoin(event)) return null
  return (
    <Section>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <Link
          to={`/events/${event.id}/join`}
          aria-label={t('registration.joinFor', { name: event.name })}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-rs-gold bg-rs-gold px-3.5 text-sm font-semibold text-rs-canvas hover:bg-rs-gold-bright md:min-h-10"
        >
          <HowToRegOutlinedIcon fontSize="small" aria-hidden="true" />
          {t('registration.join')}
        </Link>
        <p className="m-0 text-xs text-rs-muted">{t('registration.approvalHint')}</p>
      </div>
    </Section>
  )
}
