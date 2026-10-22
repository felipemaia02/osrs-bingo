import { useEffect, useState, type FormEvent } from 'react'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useSession } from '../../auth/hooks/useSession'
import { useEvents } from '../../events/hooks/useEvents'
import type { BingoEvent } from '../../events/types'
import { BulkBar } from '../components/BulkBar'
import { ConfirmDialog, PlayerAssignment } from '../components/RosterDialogs'
import { RosterCards } from '../components/RosterCards'
import { RosterTable } from '../components/RosterTable'
import { RosterTabs, type RosterTab } from '../components/RosterTabs'
import { TeamsList } from '../components/TeamsList'
import { teamErrorKey } from '../errors'
import { useRosterActions } from '../hooks/useRosterActions'
import { usePlayers, useTeamMutations, useTeams } from '../hooks/useTeams'
import type { Player } from '../types'

const PAGE_SIZE = 25
const SEARCH_DELAY_MS = 300
const FIELD =
  'w-full rounded-[3px] border border-rs-border bg-rs-inset text-rs-text min-h-11 text-base md:min-h-10 md:text-sm'

/** Layout v2 teams page (docs/design/mockups/teams-a-desktop and teams-a-mobile). */
export function TeamsPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const session = useSession()
  const events = useEvents()
  const [eventId, setEventId] = useState('')
  const selectedEvent = events.data?.find((event) => event.id === eventId)

  const eventSelect = (
    <label className={`flex flex-col gap-1 ${isDesktop ? 'w-[360px]' : ''}`}>
      <span className="text-[13px] font-semibold">{t('teams.event')}</span>
      <span className="relative flex items-center">
        <select
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
          className={`${FIELD} appearance-none pl-3 pr-9`}
        >
          <option value="">{t('teams.selectEvent')}</option>
          {events.data?.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} · {t(`events.status.${event.status}`)}
            </option>
          ))}
        </select>
        <ExpandMoreOutlinedIcon
          className="pointer-events-none absolute right-2.5"
          aria-hidden="true"
        />
      </span>
    </label>
  )

  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="flex flex-col gap-3 md:gap-4">
        {isDesktop ? (
          <div className="flex items-end justify-between gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[.18em] text-rs-gold">
                {t('teams.eyebrow')}
              </span>
              <h1 className="m-0 font-display text-[30px] font-bold leading-[1.15] text-rs-gold-bright">
                {t('teams.title')}
              </h1>
              <span className="text-rs-muted">{t('teams.description')}</span>
            </div>
            {session.data?.is_admin && eventSelect}
          </div>
        ) : (
          <>
            <Link
              to="/admin"
              className="inline-flex min-h-8 items-center gap-0.5 self-start text-[13px] text-rs-gold-bright"
            >
              <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              {t('admin.title')}
            </Link>
            <h1 className="m-0 font-display text-[23px] font-bold leading-[1.15] text-rs-gold-bright">
              {t('teams.title')}
            </h1>
            {session.data?.is_admin && eventSelect}
          </>
        )}
        {!session.data?.is_admin ? (
          <p className="rounded border border-rs-border bg-rs-surface p-6 text-rs-muted">
            {t(
              session.isLoading
                ? 'common.loading'
                : session.isError
                  ? 'common.apiError'
                  : 'auth.adminRequired',
            )}
          </p>
        ) : events.isLoading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : events.isError ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : !selectedEvent ? (
          <p className="rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
            {t('teams.selectEvent')}
          </p>
        ) : (
          <EventRoster key={selectedEvent.id} event={selectedEvent} desktop={isDesktop} />
        )}
      </div>
    </AppShell>
  )
}

function EventRoster({ event, desktop }: { event: BingoEvent; desktop: boolean }) {
  const { t } = useTranslation()
  const editable = event.status === 'draft'
  const [tab, setTab] = useState<RosterTab>('pending')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DELAY_MS)
  const [teamFilter, setTeamFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [removing, setRemoving] = useState<Player | null>(null)
  const [removingSelected, setRemovingSelected] = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)
  const [assigning, setAssigning] = useState<Player | null>(null)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const teams = useTeams(event.id)
  const group = tab === 'teams' ? 'assigned' : tab
  const players = usePlayers(event.id, {
    group,
    search,
    team_id: teamFilter || undefined,
    offset,
    limit: PAGE_SIZE,
  })
  const actions = useRosterActions(event.id)
  const counts = players.data?.counts
  const items = players.data?.items ?? []

  useEffect(() => {
    setOffset(0)
    setSelected(new Set())
  }, [search])

  useEffect(() => {
    if (players.data && offset > 0 && offset >= players.data.total) {
      setOffset(Math.max(0, Math.ceil(players.data.total / PAGE_SIZE) - 1) * PAGE_SIZE)
    }
  }, [players.data, offset])

  function changeTab(next: RosterTab, filter = '') {
    setTab(next)
    setOffset(0)
    setSearchInput('')
    setTeamFilter(filter)
    setSelected(new Set())
    actions.clearFeedback()
  }

  function changePage(next: number) {
    setOffset(next)
    setSelected(new Set())
  }

  function toggle(player: Player) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(player.id)) next.delete(player.id)
      else next.add(player.id)
      return next
    })
  }

  function toggleAll() {
    setSelected((current) =>
      items.every((player) => current.has(player.id))
        ? new Set()
        : new Set(items.map((player) => player.id)),
    )
  }

  async function confirm(action: () => Promise<boolean>, close: () => void) {
    if (await action()) {
      close()
      setSelected(new Set())
    }
  }

  const handlers = {
    onApprove: (player: Player) => void actions.approve(player),
    onAssign: (player: Player) => {
      actions.clearFeedback()
      setAssigning(player)
    },
    onRemove: (player: Player) => {
      actions.clearFeedback()
      setRemoving(player)
    },
  }
  const tabCounts: Record<RosterTab, number | null> = {
    pending: counts?.pending ?? null,
    unassigned: counts?.unassigned ?? null,
    assigned: counts?.assigned ?? null,
    teams: teams.data?.length ?? null,
  }
  // Names are listed only when every pending request is on screen (no search, single page).
  const allPendingVisible = tab === 'pending' && !search && items.length === (counts?.pending ?? -1)
  const dialogOpen = Boolean(
    removing || removingSelected || confirmAll || assigning || creatingTeam,
  )
  const total = players.data?.total ?? 0
  const rangeEnd = Math.min(offset + PAGE_SIZE, total)

  const toolbar = tab !== 'teams' && (
    <div className={`flex gap-2.5 ${desktop ? 'items-center p-3' : 'flex-col'}`}>
      <label className="relative flex flex-1 items-center">
        <SearchOutlinedIcon
          fontSize="small"
          className="pointer-events-none absolute left-2.5 text-rs-muted"
          aria-hidden="true"
        />
        <span className="sr-only">{t('teams.roster.search')}</span>
        <input
          type="search"
          maxLength={80}
          value={searchInput}
          onChange={(change) => setSearchInput(change.target.value)}
          placeholder={t('teams.roster.search')}
          className={`${FIELD} pl-[38px] pr-3 placeholder:text-rs-muted`}
        />
      </label>
      {tab === 'assigned' && (
        <label className="flex items-center gap-2 text-[13px]">
          <span className="sr-only">{t('teams.roster.teamFilter')}</span>
          <select
            value={teamFilter}
            onChange={(change) => {
              setTeamFilter(change.target.value)
              changePage(0)
            }}
            className={`${FIELD} px-3`}
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
      {tab === 'pending' && editable && (counts?.pending ?? 0) > 0 && (
        <Button
          variant="primary"
          className={desktop ? '' : 'w-full'}
          disabled={actions.saving}
          onClick={() => {
            actions.clearFeedback()
            setConfirmAll(true)
          }}
        >
          <DoneAllOutlinedIcon fontSize="small" aria-hidden="true" />
          {t('teams.roster.approveAllCount', { count: counts?.pending ?? 0 })}
        </Button>
      )}
    </div>
  )

  const feedbackLine = actions.feedback && !dialogOpen && (
    <p
      role={actions.feedback.isError ? 'alert' : 'status'}
      className={`m-0 text-sm ${desktop ? 'px-3 pb-3' : ''}`}
    >
      {actions.feedback.message}
    </p>
  )

  const list =
    tab === 'teams' ? (
      <>
        {editable && (
          <div className={desktop ? 'flex justify-end p-3' : ''}>
            <Button className={desktop ? '' : 'w-full'} onClick={() => setCreatingTeam(true)}>
              {t('teams.roster.createTeam')}
            </Button>
          </div>
        )}
        {teams.isLoading && <p role="status">{t('common.loading')}</p>}
        {teams.isError && <p role="alert">{t('common.apiError')}</p>}
        {teams.isSuccess && !teams.data.length && (
          <p className="m-0 p-3 text-rs-muted">{t('teams.noTeams')}</p>
        )}
        {teams.isSuccess && teams.data.length > 0 && (
          <TeamsList
            teams={teams.data}
            mobile={!desktop}
            onViewMembers={(team) => changeTab('assigned', team.id)}
          />
        )}
      </>
    ) : players.isLoading ? (
      <p role="status" className="m-0 p-3">
        {t('common.loading')}
      </p>
    ) : players.isError ? (
      <div role="alert" className="p-3">
        <p>{t('common.apiError')}</p>
        <Button onClick={() => void players.refetch()}>{t('auth.retry')}</Button>
      </div>
    ) : !items.length ? (
      <p className="m-0 p-3 text-rs-muted">
        {t(tab === 'pending' ? 'teams.noPending' : 'teams.noPlayers')}
      </p>
    ) : desktop ? (
      <RosterTable
        players={items}
        group={group}
        teams={teams.data ?? []}
        editable={editable}
        busy={actions.saving}
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        handlers={handlers}
      />
    ) : (
      <RosterCards
        players={items}
        group={group}
        teams={teams.data ?? []}
        editable={editable}
        busy={actions.saving}
        handlers={handlers}
      />
    )

  const pagination = tab !== 'teams' && players.data && total > 0 && (
    <div className={`flex items-center justify-between gap-3 ${desktop ? 'p-3' : 'flex-col'}`}>
      <span className="text-[13px] text-rs-muted">
        {desktop
          ? t('teams.roster.paginationPage', {
              start: offset + 1,
              end: rangeEnd,
              total,
              size: PAGE_SIZE,
            })
          : t('teams.roster.paginationShort', { start: offset + 1, end: rangeEnd, total })}
      </span>
      {(desktop || total > PAGE_SIZE) && (
        <span className="flex gap-1.5">
          <Button
            size="sm"
            disabled={offset === 0 || players.isFetching}
            onClick={() => changePage(Math.max(0, offset - PAGE_SIZE))}
          >
            {t('teams.roster.previous')}
          </Button>
          <Button
            size="sm"
            disabled={offset + PAGE_SIZE >= total || players.isFetching}
            onClick={() => changePage(offset + PAGE_SIZE)}
          >
            {t('teams.roster.next')}
          </Button>
        </span>
      )}
    </div>
  )

  return (
    <>
      {desktop ? (
        <>
          <div className="flex flex-col rounded border border-rs-border bg-rs-surface">
            <RosterTabs
              tab={tab}
              counts={tabCounts}
              eventStatus={event.status}
              onChange={changeTab}
              mobile={false}
            />
            <div role="tabpanel" id="roster-panel" aria-labelledby={`roster-tab-${tab}`}>
              {toolbar}
              {feedbackLine}
              {editable && tab !== 'teams' && selected.size > 0 && (
                <BulkBar
                  count={selected.size}
                  canApprove={tab === 'pending'}
                  busy={actions.saving}
                  onApprove={() =>
                    void confirm(
                      () => actions.approveSelected([...selected]),
                      () => undefined,
                    )
                  }
                  onRemove={() => {
                    actions.clearFeedback()
                    setRemovingSelected(true)
                  }}
                  onClear={() => setSelected(new Set())}
                />
              )}
              {list}
              {pagination}
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded border border-dashed border-rs-border px-3.5 py-2.5 text-[13px]">
            <InfoOutlinedIcon className="text-rs-muted" aria-hidden="true" />
            <span className="text-rs-muted">
              <Trans
                i18nKey="teams.roster.note"
                components={{ strong: <strong className="text-rs-text" /> }}
              />
            </span>
          </div>
        </>
      ) : (
        <>
          <RosterTabs
            tab={tab}
            counts={tabCounts}
            eventStatus={event.status}
            onChange={changeTab}
            mobile
          />
          <div
            role="tabpanel"
            id="roster-panel"
            aria-labelledby={`roster-tab-${tab}`}
            className="flex flex-col gap-3"
          >
            {!editable && (
              <p className="m-0 text-xs text-rs-muted">
                {t('teams.roster.readOnly', { status: t(`events.status.${event.status}`) })}
              </p>
            )}
            {toolbar}
            {feedbackLine}
            {list}
            {pagination}
          </div>
        </>
      )}

      {removing && (
        <ConfirmDialog
          title={t('teams.removeTitle')}
          message={t('teams.removeConfirmation', { name: removing.display_name })}
          confirmLabel={t('teams.confirmRemoval')}
          danger
          busy={actions.saving}
          error={actions.feedback}
          onConfirm={() =>
            void confirm(
              () => actions.remove(removing),
              () => setRemoving(null),
            )
          }
          onClose={() => setRemoving(null)}
        />
      )}
      {removingSelected && (
        <ConfirmDialog
          title={t('teams.bulk.removeTitle')}
          message={t('teams.bulk.removeConfirmation', { count: selected.size })}
          confirmLabel={t('teams.confirmRemoval')}
          danger
          busy={actions.saving}
          error={actions.feedback}
          onConfirm={() =>
            void confirm(
              () => actions.removeSelected([...selected]),
              () => setRemovingSelected(false),
            )
          }
          onClose={() => setRemovingSelected(false)}
        />
      )}
      {confirmAll && (
        <ConfirmDialog
          title={t('teams.roster.approveAllTitle', { count: counts?.pending ?? 0 })}
          message={
            <ApproveAllMessage
              pending={counts?.pending ?? 0}
              visible={allPendingVisible ? items : null}
            />
          }
          confirmLabel={t('teams.roster.approveCount', { count: counts?.pending ?? 0 })}
          busy={actions.saving}
          error={actions.feedback}
          onConfirm={() => void confirm(actions.approveAll, () => setConfirmAll(false))}
          onClose={() => setConfirmAll(false)}
        />
      )}
      {assigning && (
        <PlayerAssignment
          eventId={event.id}
          player={assigning}
          teams={teams.data ?? []}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setAssigning(null)
            actions.notify(t('teams.feedback.assignmentUpdated'))
          }}
        />
      )}
      {creatingTeam && (
        <CreateTeamDialog
          eventId={event.id}
          onClose={() => setCreatingTeam(false)}
          onCreated={() => {
            setCreatingTeam(false)
            actions.notify(t('teams.feedback.teamCreated'))
          }}
        />
      )}
    </>
  )
}

function ApproveAllMessage({ pending, visible }: { pending: number; visible: Player[] | null }) {
  const { i18n } = useTranslation()
  const strong = { strong: <strong /> }
  if (visible) {
    const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
      visible.map((player) => player.display_name),
    )
    return <Trans i18nKey="teams.roster.approveAllNamed" values={{ names }} components={strong} />
  }
  return (
    <Trans
      i18nKey="teams.roster.approveAllEveryone"
      values={{ count: pending }}
      components={strong}
    />
  )
}

function CreateTeamDialog({
  eventId,
  onClose,
  onCreated,
}: {
  eventId: string
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const { createTeam } = useTeamMutations()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError(t('teams.errors.invalidInput'))
      return
    }
    try {
      await createTeam.mutateAsync({ eventId, payload: { name, color: null } })
      onCreated()
    } catch (failure) {
      setError(t(teamErrorKey(failure)))
    }
  }

  return (
    <FormModal
      title={t('teams.roster.createTeam')}
      busy={createTeam.isPending}
      size="sm"
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('teams.teamName')}
          <input
            value={name}
            maxLength={80}
            onChange={(change) => setName(change.target.value)}
            className={`${FIELD} px-3 font-normal`}
          />
        </label>
        {error && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-inset p-3 text-sm"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={createTeam.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={createTeam.isPending}>
            {t(createTeam.isPending ? 'common.saving' : 'teams.create')}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
