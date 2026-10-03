import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useSession } from '../../auth/hooks/useSession'
import type { BingoEvent } from '../../events/types'
import { teamErrorKey } from '../errors'
import { useOwnRegistration, useTeamMutations, useTeams } from '../hooks/useTeams'

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

  if (session.isLoading) return <p className="mt-3 text-sm text-rs-muted">{t('common.loading')}</p>
  if (session.isError)
    return (
      <p role="alert" className="mt-3 text-sm text-rs-muted">
        {t('common.apiError')}
      </p>
    )
  if (!session.data)
    return event.status === 'draft' ? (
      <Link to="/login" className="mt-3 inline-block text-sm text-rs-gold">
        {t('registration.loginToRegister')}
      </Link>
    ) : null
  if (registration.isLoading)
    return <p className="mt-3 text-sm text-rs-muted">{t('common.loading')}</p>
  if (registration.isError)
    return (
      <p role="alert" className="mt-3 text-sm text-rs-muted">
        {t('common.apiError')}
      </p>
    )
  if (registration.data)
    return (
      <div className="mt-3 space-y-1 text-sm text-rs-muted">
        <p role="status">{t(`registration.status.${registration.data.status}`)}</p>
        <p>{registration.data.display_name}</p>
        {registration.data.status === 'approved' && (
          <p>
            {registration.data.team_id
              ? (teams.data?.find((team) => team.id === registration.data?.team_id)?.name ??
                t(teams.isError ? 'common.apiError' : 'common.loading'))
              : t('teams.unassigned')}
          </p>
        )}
      </div>
    )
  if (event.status !== 'draft') return null
  return (
    <form
      onSubmit={submit}
      className="mt-4 max-w-sm space-y-2"
      aria-label={t('registration.formFor', { name: event.name })}
    >
      <label className="block text-sm text-rs-muted">
        {t('teams.playerName')}
        <input
          required
          maxLength={12}
          value={name}
          onChange={(change) => setName(change.target.value)}
          className="mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
        />
      </label>
      <p className="text-xs text-rs-muted">{t('registration.approvalHint')}</p>
      <button
        disabled={createPlayer.isPending}
        className="rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-gold disabled:opacity-50"
      >
        {t(createPlayer.isPending ? 'common.saving' : 'registration.request')}
      </button>
      {errorKey && (
        <p role="alert" className="text-sm text-rs-muted">
          {t(errorKey)}
        </p>
      )}
    </form>
  )
}
