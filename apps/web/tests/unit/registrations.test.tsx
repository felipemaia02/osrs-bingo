import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import i18n from '../../src/lib/i18n'
import { fetchAdministrators } from '../../src/features/administration/api/administrationApi'
import { fetchSession, logout } from '../../src/features/auth/api/authApi'
import { fetchEvents, fetchMyEvents } from '../../src/features/events/api/eventsApi'
import { PlayerEventsPage } from '../../src/features/events/pages/PlayerEventsPage'
import type { BingoEvent } from '../../src/features/events/types'
import * as api from '../../src/features/teams/api/teamsApi'
import { TeamsPage } from '../../src/features/teams/pages/TeamsPage'
import type { Player, Team, PlayerFilters, PlayerPage } from '../../src/features/teams/types'
import { renderApp } from '../render'

const EVENT: BingoEvent = {
  id: 'event-1',
  name: 'Summer Bingo',
  description: null,
  status: 'draft',
  start_at: '2026-10-03T12:00:00Z',
  end_at: '2026-10-10T12:00:00Z',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}
const PLAYER: Player = {
  id: 'player-1',
  event_id: EVENT.id,
  display_name: 'Thunder Crab',
  team_id: null,
  status: 'pending',
}
const TEAM: Team = { id: 'team-1', event_id: EVENT.id, name: 'Crabs', color: null, member_count: 0 }
const USER = { id: 'user-1', discord_id: '123', username: 'Crab', is_admin: false }

function pageOf(players: Player[], filters: PlayerFilters): PlayerPage {
  const counts = { pending: 0, unassigned: 0, assigned: 0 }
  for (const player of players)
    if (player.status !== 'removed')
      counts[player.status === 'pending' ? 'pending' : player.team_id ? 'assigned' : 'unassigned']++
  const filtered = players.filter((player) => {
    const group =
      player.status === 'pending' ? 'pending' : player.team_id ? 'assigned' : 'unassigned'
    return (
      player.status !== 'removed' &&
      group === filters.group &&
      player.display_name.toLowerCase().includes(filters.search.toLowerCase()) &&
      (!filters.team_id || player.team_id === filters.team_id)
    )
  })
  return {
    items: filtered.slice(filters.offset, filters.offset + filters.limit),
    total: filtered.length,
    offset: filters.offset,
    limit: filters.limit,
    counts,
  }
}
function setPlayers(players: Player[]) {
  vi.mocked(api.fetchPlayers).mockImplementation(async (_eventId, filters) =>
    pageOf(players, filters),
  )
}

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchSession).mockResolvedValue(USER)
  vi.mocked(fetchEvents).mockImplementation(async (status) => (status === 'active' ? [] : [EVENT]))
  vi.mocked(api.fetchTeams).mockResolvedValue([TEAM])
  setPlayers([])
  vi.mocked(api.fetchOwnRegistration).mockResolvedValue(null)
})

async function openAdministration() {
  vi.mocked(fetchSession).mockResolvedValue({ ...USER, is_admin: true })
  renderApp(<TeamsPage />, '/teams')
  const user = userEvent.setup()
  await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  return user
}

it('links unregistered players to the join page instead of a nickname form', async () => {
  renderApp(<PlayerEventsPage />, '/events')

  const join = await screen.findByRole('link', { name: 'Join Summer Bingo' })
  expect(join).toHaveAttribute('href', `/events/${EVENT.id}/join`)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove registration' })).not.toBeInTheDocument()
})

it('filters my events and searches by name', async () => {
  const other = { ...EVENT, id: 'winter', name: 'Winter Bingo' }
  vi.mocked(fetchEvents).mockImplementation(async (status) =>
    status === 'active' ? [] : [EVENT, other],
  )
  vi.mocked(fetchMyEvents).mockResolvedValue([EVENT])
  const user = userEvent.setup()
  renderApp(<PlayerEventsPage />, '/events')

  await user.click(await screen.findByRole('tab', { name: /Mine 1/ }))
  expect(screen.getByRole('heading', { name: 'Summer Bingo' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Winter Bingo' })).toBeNull()

  await user.click(screen.getByRole('tab', { name: /All 2/ }))
  await user.type(screen.getByRole('searchbox', { name: 'Search events' }), 'wínter')
  expect(screen.getByRole('heading', { name: 'Winter Bingo' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Summer Bingo' })).toBeNull()
})

it('makes event cards lead to the board or the join page', async () => {
  const active = { ...EVENT, id: 'live', name: 'Cyber Event', status: 'active' as const }
  vi.mocked(fetchEvents).mockImplementation(async (status) =>
    status === 'active' ? [active] : [active, EVENT],
  )
  renderApp(<PlayerEventsPage />, '/events')

  const board = await screen.findByRole('link', { name: /Cyber Event.*Open board/ })
  expect(board).toHaveAttribute('href', '/')
  expect(await screen.findByRole('link', { name: /Summer Bingo.*Join event/ })).toHaveAttribute(
    'href',
    `/events/${EVENT.id}/join`,
  )
})

it('shows the account and buy-in status of a joined registration', async () => {
  vi.mocked(api.fetchOwnRegistration).mockResolvedValue({
    ...PLAYER,
    account_id: 'acc-1',
    activity: 'over_3h',
    buy_in_status: 'pending',
  })
  renderApp(<PlayerEventsPage />, '/events')

  expect(await screen.findByText('Registration pending approval')).toBeInTheDocument()
  expect(screen.getByText('Playing as')).toBeInTheDocument()
  expect(screen.getByText('Thunder Crab')).toBeInTheDocument()
  expect(screen.getByText('Buy-in not paid yet')).toBeInTheDocument()
})

it('requires login and prevents participant administration', async () => {
  vi.mocked(fetchSession).mockResolvedValue(null)
  renderApp(<TeamsPage />, '/teams')
  expect(
    await screen.findByText('Only administrators can manage participants.'),
  ).toBeInTheDocument()
  for (const link of screen.getAllByRole('link', { name: 'Log in with Discord' })) {
    expect(link).toHaveAttribute('href', '/login')
  }
  expect(api.fetchPlayers).not.toHaveBeenCalled()
})

it('only provides assignment after individual approval', async () => {
  setPlayers([PLAYER])
  vi.mocked(api.approvePlayer).mockImplementation(async () => {
    const approved = { ...PLAYER, status: 'approved' as const }
    setPlayers([approved])
    return approved
  })
  const user = await openAdministration()
  await screen.findByText('Thunder Crab')
  expect(screen.queryByLabelText('Team for Thunder Crab')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Approve Thunder Crab' }))
  await user.click(await screen.findByRole('tab', { name: /Unassigned/ }))
  await user.click(await screen.findByRole('button', { name: 'Change team for Thunder Crab' }))
  expect(await screen.findByLabelText('Team for Thunder Crab')).toBeInTheDocument()
  expect(vi.mocked(api.approvePlayer).mock.calls[0][0]).toEqual({
    eventId: EVENT.id,
    playerId: PLAYER.id,
  })
  expect(api.updatePlayer).not.toHaveBeenCalled()
})

it('approves all pending requests only in the selected event', async () => {
  setPlayers([PLAYER])
  vi.mocked(api.approveAllPlayers).mockImplementation(async () => {
    setPlayers([{ ...PLAYER, status: 'approved' }])
    return { approved_count: 1 }
  })
  const user = await openAdministration()
  await user.click(await screen.findByRole('button', { name: 'Approve all (1)…' }))
  const dialog = screen.getByRole('dialog', { name: 'Approve 1 request?' })
  expect(dialog).toHaveTextContent('Thunder Crab become approved, without a team.')
  await user.click(within(dialog).getByRole('button', { name: 'Approve 1' }))
  expect(vi.mocked(api.approveAllPlayers).mock.calls[0][0]).toEqual({ eventId: EVENT.id })
  expect(await screen.findByText('No pending requests.')).toBeInTheDocument()
})

it('assigns an approved registration without creating a new one', async () => {
  setPlayers([{ ...PLAYER, status: 'approved' }])
  vi.mocked(api.updatePlayer).mockImplementation(async ({ payload }) => {
    const updated = { ...PLAYER, status: 'approved' as const, team_id: payload.team_id }
    setPlayers([updated])
    return updated
  })
  const user = await openAdministration()
  await user.click(await screen.findByRole('tab', { name: /Unassigned/ }))
  await user.click(await screen.findByRole('button', { name: 'Change team for Thunder Crab' }))
  await user.selectOptions(await screen.findByLabelText('Team for Thunder Crab'), TEAM.id)
  await user.click(screen.getByRole('button', { name: 'Save team assignment' }))
  expect(await screen.findByText('Team assignment updated.')).toBeInTheDocument()
  expect(vi.mocked(api.updatePlayer).mock.calls[0][0]).toEqual({
    eventId: EVENT.id,
    playerId: PLAYER.id,
    payload: { team_id: TEAM.id },
  })
  expect(api.createPlayer).not.toHaveBeenCalled()
})

it('confirms removal and refreshes the participant list', async () => {
  setPlayers([PLAYER])
  vi.mocked(api.removePlayer).mockImplementation(async () => {
    setPlayers([])
    return { ...PLAYER, status: 'removed' }
  })
  const user = await openAdministration()
  await user.click(await screen.findByRole('button', { name: 'Remove Thunder Crab' }))
  const dialog = screen.getByRole('dialog', { name: 'Remove registration?' })
  expect(api.removePlayer).not.toHaveBeenCalled()
  await user.click(within(dialog).getByRole('button', { name: 'Confirm removal' }))
  expect(await screen.findByText('Registration removed.')).toBeInTheDocument()
  expect(vi.mocked(api.removePlayer).mock.calls[0][0]).toEqual({
    eventId: EVENT.id,
    playerId: PLAYER.id,
  })
  expect(screen.queryByText('Thunder Crab')).not.toBeInTheDocument()
})

it('shows approval conflicts without assigning a team', async () => {
  setPlayers([PLAYER])
  const error = new AxiosError('conflict')
  error.response = {
    status: 409,
    data: { detail: 'Only pending registrations can be approved' },
  } as never
  vi.mocked(api.approvePlayer).mockRejectedValue(error)
  const user = await openAdministration()
  await user.click(await screen.findByRole('button', { name: 'Approve Thunder Crab' }))
  expect(await screen.findByText('This request is no longer pending.')).toBeInTheDocument()
  expect(screen.queryByLabelText('Team for Thunder Crab')).not.toBeInTheDocument()
})

it('clears privileged UI after logout', async () => {
  const user = await openAdministration()
  await user.click(screen.getAllByRole('button', { name: /account$/ })[0])
  await user.click(await screen.findByRole('menuitem', { name: 'Log out' }))
  await waitFor(() => expect(logout).toHaveBeenCalled())
  expect(
    await screen.findByText('Only administrators can manage participants.'),
  ).toBeInTheDocument()
  expect(screen.queryByLabelText('Event')).not.toBeInTheDocument()
})

it.each([
  ['pt', 'Inscrição aguardando aprovação'],
  ['es', 'Inscripción pendiente de aprobación'],
])('localizes registration in %s', async (language, text) => {
  await i18n.changeLanguage(language)
  vi.mocked(api.fetchOwnRegistration).mockResolvedValue(PLAYER)
  renderApp(<PlayerEventsPage />, '/events')
  expect(await screen.findByText(text)).toBeInTheDocument()
})

it('opens the oldest draft, hides finished events and keeps queries scoped', async () => {
  const other = {
    ...EVENT,
    id: 'event-2',
    name: 'Winter Bingo',
    created_at: '2026-10-05T12:00:00Z',
  }
  const finished = { ...EVENT, id: 'event-3', name: 'Old Bingo', status: 'finished' as const }
  vi.mocked(fetchSession).mockResolvedValue({ ...USER, is_admin: true })
  vi.mocked(fetchEvents).mockImplementation(async (status) =>
    status === 'active' ? [] : [other, EVENT, finished],
  )
  vi.mocked(api.fetchPlayers).mockImplementation(async (eventId, filters) =>
    pageOf(eventId === EVENT.id ? [PLAYER] : [], filters),
  )
  const user = userEvent.setup()
  renderApp(<TeamsPage />, '/teams')

  // No active event: the draft created first is opened without choosing.
  expect(await screen.findByText('Thunder Crab')).toBeInTheDocument()
  expect(screen.getByLabelText('Event')).toHaveValue(EVENT.id)
  expect(screen.queryByRole('option', { name: 'Old Bingo · Finished' })).toBeNull()

  await user.selectOptions(screen.getByLabelText('Event'), other.id)
  expect(await screen.findByText('No pending requests.')).toBeInTheDocument()
  expect(screen.queryByText('Thunder Crab')).not.toBeInTheDocument()
  expect(api.fetchPlayers).toHaveBeenCalledWith(
    other.id,
    expect.objectContaining({ offset: 0, group: 'pending' }),
  )
})

it('opens the active event before any draft', async () => {
  const active = { ...EVENT, id: 'event-9', name: 'Live Bingo', status: 'active' as const }
  vi.mocked(fetchSession).mockResolvedValue({ ...USER, is_admin: true })
  vi.mocked(fetchEvents).mockResolvedValue([EVENT, active])
  renderApp(<TeamsPage />, '/teams')

  await waitFor(() => expect(screen.getByLabelText('Event')).toHaveValue(active.id))
})

it('shows active events as read-only even to administrators', async () => {
  vi.mocked(fetchSession).mockResolvedValue({ ...USER, is_admin: true })
  vi.mocked(fetchEvents).mockResolvedValue([{ ...EVENT, status: 'active' }])
  setPlayers([{ ...PLAYER, status: 'approved' }])
  const user = userEvent.setup()
  renderApp(<TeamsPage />, '/teams')
  await screen.findByLabelText('Event')
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  await user.click(await screen.findByRole('tab', { name: /Unassigned/ }))
  expect(await screen.findByText('Thunder Crab')).toBeInTheDocument()
  expect(screen.queryByLabelText('Team for Thunder Crab')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove Thunder Crab' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Approve all pending' })).not.toBeInTheDocument()
})

it('paginates on the API and resets the page when searching', async () => {
  setPlayers(
    Array.from({ length: 30 }, (_, index) => ({
      ...PLAYER,
      id: `player-${index}`,
      display_name: `Player ${index}`,
    })),
  )
  const user = await openAdministration()
  expect(await screen.findByText('1–25 of 30 · 25 per page')).toBeInTheDocument()
  expect(screen.queryByText('Player 25')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByText('26–30 of 30 · 25 per page')).toBeInTheDocument()
  expect(api.fetchPlayers).toHaveBeenLastCalledWith(
    EVENT.id,
    expect.objectContaining({ offset: 25, limit: 25 }),
  )
  await user.type(screen.getByRole('searchbox'), 'Player 29')
  expect(await screen.findByText('1–1 of 1 · 25 per page')).toBeInTheDocument()
  expect(api.fetchPlayers).toHaveBeenLastCalledWith(
    EVENT.id,
    expect.objectContaining({ offset: 0, search: 'Player 29' }),
  )
  expect(screen.getByRole('tab', { name: 'Pending 30' })).toBeInTheDocument()
})

it('creates a team in a modal and opens its filtered member list', async () => {
  setPlayers([{ ...PLAYER, status: 'approved', team_id: TEAM.id }])
  vi.mocked(api.createTeam).mockResolvedValue(TEAM)
  const user = await openAdministration()
  await user.click(await screen.findByRole('tab', { name: /^Teams/ }))
  expect(screen.queryByLabelText('Team name')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Create team' }))
  const dialog = screen.getByRole('dialog', { name: 'Create team' })
  await user.type(within(dialog).getByLabelText('Team name'), 'Crabs')
  await user.click(within(dialog).getByRole('button', { name: 'Create' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(api.createTeam).toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'View members of Crabs' }))
  expect(await screen.findByText('Thunder Crab')).toBeInTheDocument()
  expect(api.fetchPlayers).toHaveBeenLastCalledWith(
    EVENT.id,
    expect.objectContaining({ group: 'assigned', team_id: TEAM.id, offset: 0 }),
  )
})

it('returns to the previous page when the last row is removed', async () => {
  const players = Array.from({ length: 26 }, (_, index) => ({
    ...PLAYER,
    id: `player-${index}`,
    display_name: `Player ${index}`,
  }))
  setPlayers(players)
  vi.mocked(api.removePlayer).mockImplementation(async () => {
    setPlayers(players.slice(0, 25))
    return { ...players[25], status: 'removed' }
  })
  const user = await openAdministration()
  await screen.findByText('1–25 of 26 · 25 per page')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(await screen.findByRole('button', { name: 'Remove Player 25' }))
  await user.click(screen.getByRole('button', { name: 'Confirm removal' }))
  expect(await screen.findByText('1–25 of 25 · 25 per page')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
})

describe('teams v2 selection and columns', () => {
  const pending = (index: number, extra: Partial<Player> = {}): Player => ({
    ...PLAYER,
    id: `p${index}`,
    display_name: `Player ${index}`,
    discord_username: `discord${index}`,
    created_at: '2026-10-21T18:02:00Z',
    ...extra,
  })

  it('shows Discord and request time, with "—" for legacy registrations', async () => {
    setPlayers([pending(1), pending(2, { discord_username: null })])
    await openAdministration()
    const row = (await screen.findByText('Player 1')).closest('tr')!
    expect(row).toHaveTextContent('discord1')
    expect(row).toHaveTextContent(/Oct 21/)
    expect(screen.getByText('Player 2').closest('tr')).toHaveTextContent('—')
    expect(screen.getByText('Editable: draft event')).toBeInTheDocument()
    expect(screen.getByText(/doesn't delete the request/)).toBeInTheDocument()
  })

  it('approves selected registrations and reports skipped ones', async () => {
    setPlayers([pending(1), pending(2), pending(3)])
    vi.mocked(api.approveSelectedPlayers).mockResolvedValue({ changed: 1, skipped: 1 })
    const user = await openAdministration()

    await user.click(await screen.findByRole('checkbox', { name: 'Select Player 1' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Player 2' }))
    const bar = screen.getByRole('region', { name: 'Bulk actions' })
    expect(bar).toHaveTextContent('2 selected')
    await user.click(within(bar).getByRole('button', { name: 'Approve selected' }))

    expect(vi.mocked(api.approveSelectedPlayers).mock.calls[0][0]).toEqual({
      eventId: EVENT.id,
      playerIds: ['p1', 'p2'],
    })
    expect(
      await screen.findByText('1 approved. 1 skipped because it had already changed.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()
  })

  it('selects the whole page and removes it after confirmation', async () => {
    setPlayers([pending(1), pending(2)])
    vi.mocked(api.removeSelectedPlayers).mockResolvedValue({ changed: 2, skipped: 0 })
    const user = await openAdministration()

    await user.click(await screen.findByRole('checkbox', { name: 'Select all' }))
    expect(screen.getByRole('checkbox', { name: 'Select Player 2' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Remove selected' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove selected registrations?' })
    expect(dialog).toHaveTextContent('Remove 2 selected registrations?')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm removal' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(vi.mocked(api.removeSelectedPlayers).mock.calls[0][0].playerIds).toEqual(['p1', 'p2'])
    expect(await screen.findByText('2 removed.')).toBeInTheDocument()
  })

  it('clears the selection when switching tabs and offers only removal outside Pending', async () => {
    setPlayers([pending(1), pending(2, { status: 'approved' })])
    const user = await openAdministration()
    await user.click(await screen.findByRole('checkbox', { name: 'Select Player 1' }))
    await user.click(screen.getByRole('tab', { name: /Unassigned/ }))
    await user.click(await screen.findByRole('checkbox', { name: 'Select Player 2' }))
    const bar = screen.getByRole('region', { name: 'Bulk actions' })
    expect(bar).toHaveTextContent('1 selected')
    expect(within(bar).queryByRole('button', { name: 'Approve selected' })).not.toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Remove selected' })).toBeInTheDocument()
  })

  it('hides selection and actions for an active event', async () => {
    vi.mocked(fetchEvents).mockImplementation(async (status) =>
      status === 'draft' ? [] : [{ ...EVENT, status: 'active' }],
    )
    setPlayers([pending(1)])
    vi.mocked(fetchSession).mockResolvedValue({ ...USER, is_admin: true })
    renderApp(<TeamsPage />, '/teams')
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Summer Bingo · Active' })
    await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)

    expect(await screen.findByText('Player 1')).toBeInTheDocument()
    expect(screen.getByText('Read-only: Active event')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve Player 1' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Approve all/ })).not.toBeInTheDocument()
  })

  it('uses cards without multi-select on mobile', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
    setPlayers([pending(1), pending(2)])
    const user = await openAdministration()

    expect(await screen.findByRole('link', { name: 'Administration' })).toHaveAttribute(
      'href',
      '/admin',
    )
    expect(screen.getByRole('tab', { name: 'Pending 2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/discord1 · Oct 21/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Approve Player 1' }))
    expect(api.approvePlayer).toHaveBeenCalled()
    expect(screen.getByText('1–2 of 2')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('participants and team balance (feature 023)', () => {
  const PAID_EVENT = { ...EVENT, buy_in: '5M gp' }
  const ADMIN = { id: 'admin-1', discord_id: '9', username: 'felps_', is_admin: true }
  const approved = (index: number, extra: Partial<Player> = {}): Player => ({
    ...PLAYER,
    id: `a${index}`,
    status: 'approved',
    display_name: `Player ${index}`,
    discord_username: `discord${index}`,
    account_id: `acc${index}`,
    activity: 'one_to_three_h',
    buy_in_status: 'pending',
    ...extra,
  })

  beforeEach(() => {
    vi.mocked(fetchEvents).mockImplementation(async (status) =>
      status === 'active' ? [] : [PAID_EVENT],
    )
    vi.mocked(api.fetchTeamBalance).mockResolvedValue({
      average_ehb: 900,
      teams: [
        {
          team_id: TEAM.id,
          name: 'Crabs',
          color: null,
          player_count: 6,
          boss_kc_total: 67605,
          ehb_total: 1100,
          captain: 'felps_',
          ehb_vs_average: 22,
          players_short: 0,
          balanced: false,
        },
        {
          team_id: 'team-2',
          name: 'Lobsters',
          color: null,
          player_count: 5,
          boss_kc_total: 40000,
          ehb_total: 880,
          captain: null,
          ehb_vs_average: -2,
          players_short: 1,
          balanced: true,
        },
      ],
    })
    vi.mocked(fetchAdministrators).mockResolvedValue([
      ADMIN,
      { ...ADMIN, id: 'admin-2', username: 'mod_bia' },
    ])
  })

  it('shows team balance cards against the average', async () => {
    await openAdministration()

    const crabs = await screen.findByRole('article', { name: 'Crabs' })
    expect(within(crabs).getByText('6 players')).toBeInTheDocument()
    expect(within(crabs).getByText('1,100')).toBeInTheDocument()
    expect(within(crabs).getByText('67,605')).toBeInTheDocument()
    expect(within(crabs).getByText('+22% vs average')).toBeInTheDocument()
    const lobsters = screen.getByRole('article', { name: 'Lobsters' })
    expect(within(lobsters).getByText('No captain')).toBeInTheDocument()
    expect(within(lobsters).getByText(/−2% vs average · 1 player short/)).toBeInTheDocument()
    expect(screen.getByText(/average EHB per team 900/)).toBeInTheDocument()
  })

  it('lists experience, wishes, role and buy-in for each participant', async () => {
    setPlayers([
      approved(1, {
        alt_count: 2,
        boss_kc_total: 17950,
        ehb_total: 845.2,
        timezone: 'America/Sao_Paulo',
        teammates: ['Druid Duda'],
        role: 'instructor',
        buy_in_status: 'paid',
        buy_in_admin_name: 'felps_',
      }),
      approved(2, { account_id: null, buy_in_status: null, activity: null }),
    ])
    const user = await openAdministration()
    await user.click(screen.getByRole('tab', { name: /Unassigned/ }))

    const row = (await screen.findByText('Player 1')).closest('tr')!
    expect(row).toHaveTextContent('discord1 · main + 2 alts')
    expect(row).toHaveTextContent('Sao Paulo')
    expect(row).toHaveTextContent('1–3 h/day')
    expect(row).toHaveTextContent('17,950')
    expect(row).toHaveTextContent('845.2')
    expect(row).toHaveTextContent('Druid Duda')
    expect(within(row).getByText('Instructor')).toBeInTheDocument()
    expect(within(row).getByText('Paid')).toBeInTheDocument()
    expect(within(row).getByText('to felps_')).toBeInTheDocument()
    expect(screen.getByText('Sorted by EHB total ↓')).toBeInTheDocument()
  })

  it('edits role and buy-in, recording who received the payment', async () => {
    setPlayers([approved(1, { team_id: TEAM.id })])
    vi.mocked(fetchSession).mockResolvedValue(ADMIN)
    vi.mocked(api.updateParticipation)
      .mockRejectedValueOnce(
        new AxiosError('conflict', '409', undefined, undefined, {
          status: 409,
          data: { detail: 'This team already has a captain' },
        } as never),
      )
      .mockResolvedValueOnce(approved(1))
    renderApp(<TeamsPage />, '/teams')
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
    await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
    await user.click(await screen.findByRole('tab', { name: /Assigned/ }))
    await user.click(await screen.findByRole('button', { name: 'Edit Player 1' }))

    const dialog = screen.getByRole('dialog', { name: 'Edit Player 1' })
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'captain')
    await user.selectOptions(within(dialog).getByLabelText('Buy-in'), 'paid')
    const receiver = await within(dialog).findByLabelText('Received by')
    expect(receiver).toHaveValue('admin-1')
    await user.selectOptions(receiver, 'admin-2')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await within(dialog).findByText('This team already has a captain.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Player 1 updated.')).toBeInTheDocument()
    expect(vi.mocked(api.updateParticipation).mock.calls[1][0]).toEqual({
      eventId: EVENT.id,
      playerId: 'a1',
      payload: { role: 'captain', buy_in_status: 'paid', buy_in_admin_id: 'admin-2' },
    })
  })
})
