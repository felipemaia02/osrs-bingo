import { useState, type FormEvent, type ReactNode } from 'react'
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, type BadgeTone } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { useSession } from '../../auth/hooks/useSession'
import type { BingoEvent } from '../../events/types'
import { teamErrorKey } from '../errors'
import { useOwnRegistration, useTeamMutations, useTeams } from '../hooks/useTeams'
import type { Player } from '../types'

const OSRS_NAME_MAX_LENGTH = 12
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
  const { createPlayer } = useTeamMutations()
  const [name, setName] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function submit(eventForm: FormEvent) {
    eventForm.preventDefault()
    setErrorKey(null)
    if (!name.trim()) {
      setErrorKey('teams.errors.invalidInput')
      return
    }
    try {
      await createPlayer.mutateAsync({ eventId: event.id, payload: { display_name: name } })
      setName('')
    } catch (error) {
      setErrorKey(teamErrorKey(error))
    }
  }

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
    return event.status === 'draft' ? (
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
          <strong>{own.display_name}</strong>
          {own.status === 'approved' && <span className="text-rs-muted">· {teamName}</span>}
        </div>
        {own.status !== 'approved' && (
          <p className="mb-0 mt-1 text-xs text-rs-muted">
            {t(`registration.status.${own.status}`)}
          </p>
        )}
      </Section>
    )
  }
  if (event.status !== 'draft') return null
  return (
    <Section>
      <form
        onSubmit={submit}
        className="flex flex-col gap-2"
        aria-label={t('registration.formFor', { name: event.name })}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <label className="flex flex-col gap-1 text-[13px] font-semibold md:w-72">
            {t('teams.playerName')}
            <input
              required
              maxLength={OSRS_NAME_MAX_LENGTH}
              value={name}
              onChange={(change) => setName(change.target.value)}
              className={`${FIELD_CLASS} font-normal`}
            />
          </label>
          <Button type="submit" variant="primary" disabled={createPlayer.isPending}>
            <HowToRegOutlinedIcon fontSize="small" aria-hidden="true" />
            {t(createPlayer.isPending ? 'common.saving' : 'registration.request')}
          </Button>
        </div>
        <p className="m-0 text-xs text-rs-muted">{t('registration.approvalHint')}</p>
        {errorKey && (
          <p role="alert" className="m-0 text-sm text-rs-danger-text">
            {t(errorKey)}
          </p>
        )}
      </form>
    </Section>
  )
}
