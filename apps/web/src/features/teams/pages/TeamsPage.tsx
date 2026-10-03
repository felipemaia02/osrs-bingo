import { useState, type FormEvent } from 'react'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { Panel } from '../../../components/ui/Panel'
import { useSession } from '../../auth/hooks/useSession'
import { useEvents } from '../../events/hooks/useEvents'
import { PlayerRoster } from '../components/PlayerRoster'
import { teamErrorKey } from '../errors'
import { usePlayers, useTeamMutations, useTeams } from '../hooks/useTeams'

export function TeamsPage() {
  const { t } = useTranslation()
  const session = useSession()
  const events = useEvents()
  const [eventId, setEventId] = useState('')
  const selectedEvent = events.data?.find((event) => event.id === eventId)
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-rs-gold">
            {t('teams.eyebrow')}
          </p>
          <h1 className="font-display text-2xl font-bold text-rs-text">{t('teams.title')}</h1>
          <p className="mt-2 text-sm text-rs-muted">{t('teams.description')}</p>
        </div>
        {session.data?.is_admin ? (
          <>
            <Panel className="p-4">
              <label className="block text-sm text-rs-muted">
                {t('teams.event')}
                <select
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                  className="mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
                >
                  <option value="">{t('teams.selectEvent')}</option>
                  {events.data?.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} · {t(`events.status.${event.status}`)}
                    </option>
                  ))}
                </select>
              </label>
              {events.isLoading && (
                <p role="status" className="mt-3 text-sm text-rs-muted">
                  {t('common.loading')}
                </p>
              )}
              {events.isError && (
                <p role="alert" className="mt-3 text-sm text-rs-muted">
                  {t('common.apiError')}
                </p>
              )}
            </Panel>
            {!selectedEvent ? (
              <Panel className="p-8 text-center text-rs-muted">{t('teams.selectEvent')}</Panel>
            ) : (
              <EventTeams
                key={selectedEvent.id}
                eventId={selectedEvent.id}
                editable={selectedEvent.status === 'draft'}
              />
            )}
          </>
        ) : (
          <Panel className="p-6 text-rs-muted">
            {t(
              session.isLoading
                ? 'common.loading'
                : session.isError
                  ? 'common.apiError'
                  : 'auth.adminRequired',
            )}
          </Panel>
        )}
      </div>
    </AppShell>
  )
}

function EventTeams({ eventId, editable }: { eventId: string; editable: boolean }) {
  const { t } = useTranslation()
  const [teamName, setTeamName] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const teams = useTeams(eventId)
  const players = usePlayers(eventId)
  const { createTeam } = useTeamMutations()

  async function submitTeam(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    if (!teamName.trim()) {
      setFeedback('teams.errors.invalidInput')
      return
    }
    try {
      await createTeam.mutateAsync({ eventId, payload: { name: teamName, color: null } })
      setTeamName('')
      setFeedback('teams.feedback.teamCreated')
    } catch (error) {
      setFeedback(teamErrorKey(error))
    }
  }

  return (
    <>
      {!editable && (
        <p role="status" className="text-sm text-rs-muted">
          {t('teams.errors.readOnly')}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-4">
          <h2 className="flex items-center gap-2 font-display text-rs-gold-bright">
            <GroupsOutlinedIcon aria-hidden="true" />
            {t('teams.teams')}
          </h2>
          {editable && (
            <form onSubmit={submitTeam} className="mt-3 space-y-2">
              <label className="block text-sm text-rs-muted">
                {t('teams.teamName')}
                <input
                  required
                  maxLength={80}
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  className="mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
                />
              </label>
              <button
                disabled={createTeam.isPending}
                className="rounded-sm bg-rs-gold px-3 py-2 font-semibold text-rs-inset disabled:opacity-50"
              >
                {t(createTeam.isPending ? 'common.saving' : 'teams.create')}
              </button>
            </form>
          )}
          {feedback && (
            <p role="status" className="mt-3 text-sm text-rs-muted">
              {t(feedback)}
            </p>
          )}
          {teams.isLoading && (
            <p role="status" className="mt-4 text-rs-muted">
              {t('common.loading')}
            </p>
          )}
          {teams.isError && (
            <p role="alert" className="mt-4 text-rs-muted">
              {t('common.apiError')}
            </p>
          )}
          {teams.isSuccess && !teams.data.length && (
            <p className="mt-4 text-sm text-rs-muted">{t('teams.noTeams')}</p>
          )}
          <ul className="mt-4 space-y-2">
            {teams.data?.map((team) => (
              <li
                key={team.id}
                className="flex justify-between gap-3 rounded-sm border border-rs-border/50 p-2 text-rs-text"
              >
                <span>{team.name}</span>
                <span className="text-rs-muted">
                  {t('teams.memberCount', { count: team.member_count })}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-4">
          <h2 className="flex items-center gap-2 font-display text-rs-gold-bright">
            <PersonOutlineIcon aria-hidden="true" />
            {t('teams.players')}
          </h2>
          <p className="mt-2 text-sm text-rs-muted">{t('teams.registrationHint')}</p>
          {players.isLoading && (
            <p role="status" className="mt-4 text-rs-muted">
              {t('common.loading')}
            </p>
          )}
          {players.isError && (
            <p role="alert" className="mt-4 text-rs-muted">
              {t('common.apiError')}
            </p>
          )}
          {players.isSuccess && (
            <PlayerRoster
              eventId={eventId}
              players={players.data}
              teams={teams.data ?? []}
              editable={editable && teams.isSuccess}
            />
          )}
        </Panel>
      </div>
    </>
  )
}
