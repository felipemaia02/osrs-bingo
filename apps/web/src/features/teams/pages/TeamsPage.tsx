import { useEffect, useState, type FormEvent } from 'react'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import { FormModal } from '../../../components/ui/FormModal'
import type { RosterGroup } from '../types'
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
      <div className="mx-auto max-w-7xl space-y-5">
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

const PAGE_SIZE = 25
const buttonClass =
  'rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-gold disabled:opacity-40'

function EventTeams({ eventId, editable }: { eventId: string; editable: boolean }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<RosterGroup | 'teams'>('pending')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [teamName, setTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const teams = useTeams(eventId)
  const players = usePlayers(eventId, {
    group: tab === 'teams' ? 'assigned' : tab,
    search,
    team_id: teamFilter || undefined,
    offset,
    limit: PAGE_SIZE,
  })
  const { createTeam } = useTeamMutations()

  useEffect(() => {
    if (players.data && offset > 0 && offset >= players.data.total) {
      setOffset(Math.max(0, Math.ceil(players.data.total / PAGE_SIZE) - 1) * PAGE_SIZE)
    }
  }, [players.data, offset])

  function changeTab(next: typeof tab) {
    setTab(next)
    setOffset(0)
    setSearch('')
    setSearchInput('')
    setTeamFilter('')
  }

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
      setCreating(false)
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
      <div role="tablist" aria-label={t('teams.roster.tabs')} className="flex flex-wrap gap-2">
        {(['pending', 'unassigned', 'assigned', 'teams'] as const).map((value) => (
          <button
            key={value}
            role="tab"
            id={`roster-tab-${value}`}
            aria-controls="roster-panel"
            aria-selected={tab === value}
            onClick={() => changeTab(value)}
            className={`${buttonClass} ${tab === value ? 'bg-rs-gold/10 border-rs-gold' : ''}`}
          >
            {t(`teams.roster.${value}`)}{' '}
            <span className="ml-2">
              (
              {value === 'teams'
                ? (teams.data?.length ?? '…')
                : (players.data?.counts[value] ?? '…')}
              )
            </span>
          </button>
        ))}
      </div>
      <Panel
        role="tabpanel"
        id="roster-panel"
        aria-labelledby={`roster-tab-${tab}`}
        className="p-4"
      >
        {feedback && !creating && (
          <p role="status" className="mb-4 text-sm text-rs-muted">
            {t(feedback)}
          </p>
        )}
        {tab === 'teams' ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-rs-gold">
                <GroupsOutlinedIcon aria-hidden="true" />
                {t('teams.teams')}
              </h2>
              {editable && (
                <button
                  className={buttonClass}
                  onClick={() => {
                    setFeedback(null)
                    setTeamName('')
                    setCreating(true)
                  }}
                >
                  {t('teams.roster.createTeam')}
                </button>
              )}
            </div>
            {teams.isLoading && <p role="status">{t('common.loading')}</p>}
            {teams.isError && <p role="alert">{t('common.apiError')}</p>}
            {teams.isSuccess && !teams.data.length && (
              <p className="mt-4 text-rs-muted">{t('teams.noTeams')}</p>
            )}
            <ul className="mt-4 divide-y divide-rs-border/40">
              {teams.data?.map((team) => (
                <li key={team.id} className="flex flex-wrap items-center gap-4 py-3">
                  <span className="flex-1 text-rs-text">{team.name}</span>
                  <span className="text-sm text-rs-muted">
                    {t('teams.memberCount', { count: team.member_count })}
                  </span>
                  <button
                    className={buttonClass}
                    onClick={() => {
                      changeTab('assigned')
                      setTeamFilter(team.id)
                    }}
                  >
                    {t('teams.roster.viewMembers', { name: team.name })}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                setSearch(searchInput.trim())
                setOffset(0)
              }}
              className="mb-4 flex flex-wrap items-end gap-3"
            >
              <label className="min-w-0 flex-1 text-sm text-rs-muted">
                {t('teams.roster.search')}
                <input
                  type="search"
                  maxLength={80}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
                />
              </label>
              <button className={buttonClass}>{t('teams.roster.searchAction')}</button>
              {tab === 'assigned' && (
                <label className="text-sm text-rs-muted">
                  {t('teams.roster.teamFilter')}
                  <select
                    value={teamFilter}
                    onChange={(event) => {
                      setTeamFilter(event.target.value)
                      setOffset(0)
                    }}
                    className="mt-1 block w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
                  >
                    <option value="">{t('teams.roster.allTeams')}</option>
                    {teams.data?.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </form>
            {players.isLoading && <p role="status">{t('common.loading')}</p>}
            {players.isError && (
              <div role="alert">
                <p>{t('common.apiError')}</p>
                <button className={buttonClass} onClick={() => void players.refetch()}>
                  {t('auth.retry')}
                </button>
              </div>
            )}
            {teams.isError && <p role="alert">{t('common.apiError')}</p>}
            {players.data && !players.isError && (
              <>
                <PlayerRoster
                  eventId={eventId}
                  players={players.data.items}
                  teams={teams.data ?? []}
                  editable={editable && teams.isSuccess}
                  pendingCount={players.data.counts.pending}
                  group={tab}
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rs-border pt-4">
                  <p role="status" className="text-sm text-rs-muted">
                    {t('teams.roster.pagination', {
                      start: players.data.total ? offset + 1 : 0,
                      end: Math.min(offset + PAGE_SIZE, players.data.total),
                      total: players.data.total,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className={buttonClass}
                      disabled={offset === 0 || players.isFetching}
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    >
                      {t('teams.roster.previous')}
                    </button>
                    <button
                      className={buttonClass}
                      disabled={offset + PAGE_SIZE >= players.data.total || players.isFetching}
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                    >
                      {t('teams.roster.next')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Panel>
      {creating && (
        <FormModal
          title={t('teams.roster.createTeam')}
          busy={createTeam.isPending}
          onClose={() => {
            if (!createTeam.isPending) {
              setCreating(false)
              setFeedback(null)
            }
          }}
        >
          <form onSubmit={submitTeam} className="space-y-4">
            <label className="block text-sm text-rs-muted">
              {t('teams.teamName')}
              <input
                required
                maxLength={80}
                disabled={createTeam.isPending}
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                className="mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
              />
            </label>
            {feedback && <p role="alert">{t(feedback)}</p>}
            <button disabled={createTeam.isPending} className={buttonClass}>
              {t(createTeam.isPending ? 'common.saving' : 'teams.create')}
            </button>
          </form>
        </FormModal>
      )}
    </>
  )
}
