import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import i18n from '../../src/lib/i18n'
import { fetchSession, logout } from '../../src/features/auth/api/authApi'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import { EventsPage } from '../../src/features/events/pages/EventsPage'
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

it('requests registration without a team and refreshes pending status', async () => {
  const user = userEvent.setup()
  vi.mocked(api.createPlayer).mockImplementation(async () => {
    vi.mocked(api.fetchOwnRegistration).mockResolvedValue(PLAYER)
    return PLAYER
  })
  renderApp(<EventsPage />, '/events')
  await user.type(await screen.findByLabelText('OSRS display name'), 'Thunder Crab')
  await user.click(screen.getByRole('button', { name: 'Request registration' }))
  expect(await screen.findByText('Registration pending approval')).toBeInTheDocument()
  expect(vi.mocked(api.createPlayer).mock.calls[0][0]).toEqual({
    eventId: EVENT.id,
    payload: { display_name: 'Thunder Crab' },
  })
  expect(screen.queryByRole('button', { name: 'Create event' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove registration' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Team for Thunder Crab')).not.toBeInTheDocument()
})

it('requires login and prevents participant administration', async () => {
  vi.mocked(fetchSession).mockResolvedValue(null)
  renderApp(<TeamsPage />, '/teams')
  expect(
    await screen.findByText('Only administrators can manage participants.'),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in with Discord' })).toHaveAttribute(
    'href',
    '/login',
  )
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
  await user.click(await screen.findByRole('button', { name: 'Approve all pending' }))
  await user.click(screen.getByRole('button', { name: 'Confirm approval' }))
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
  await user.click(screen.getByRole('button', { name: 'Log out' }))
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
  renderApp(<EventsPage />, '/events')
  expect(await screen.findByText(text)).toBeInTheDocument()
})

it('keeps participant queries scoped to the selected administrative event', async () => {
  const other = { ...EVENT, id: 'event-2', name: 'Winter Bingo' }
  vi.mocked(fetchSession).mockResolvedValue({ ...USER, is_admin: true })
  vi.mocked(fetchEvents).mockImplementation(async (status) =>
    status === 'active' ? [] : [EVENT, other],
  )
  vi.mocked(api.fetchPlayers).mockImplementation(async (eventId, filters) =>
    pageOf(eventId === EVENT.id ? [PLAYER] : [], filters),
  )
  const user = userEvent.setup()
  renderApp(<TeamsPage />, '/teams')
  await screen.findByRole('option', { name: 'Winter Bingo · Draft' })
  expect(api.fetchPlayers).not.toHaveBeenCalled()
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  await screen.findByText('Thunder Crab')
  await user.selectOptions(screen.getByLabelText('Event'), other.id)
  expect(await screen.findByText('No pending requests.')).toBeInTheDocument()
  expect(screen.queryByText('Thunder Crab')).not.toBeInTheDocument()
  expect(api.fetchPlayers).toHaveBeenCalledWith(
    other.id,
    expect.objectContaining({ offset: 0, group: 'pending' }),
  )
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
  expect(await screen.findByText('1–25 of 30 participants')).toBeInTheDocument()
  expect(screen.queryByText('Player 25')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByText('26–30 of 30 participants')).toBeInTheDocument()
  expect(api.fetchPlayers).toHaveBeenLastCalledWith(
    EVENT.id,
    expect.objectContaining({ offset: 25, limit: 25 }),
  )
  await user.type(screen.getByRole('searchbox'), 'Player 29')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  expect(await screen.findByText('1–1 of 1 participants')).toBeInTheDocument()
  expect(api.fetchPlayers).toHaveBeenLastCalledWith(
    EVENT.id,
    expect.objectContaining({ offset: 0, search: 'Player 29' }),
  )
  expect(screen.getByRole('tab', { name: 'Pending (30)' })).toBeInTheDocument()
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
  await screen.findByText('1–25 of 26 participants')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(await screen.findByRole('button', { name: 'Remove Player 25' }))
  await user.click(screen.getByRole('button', { name: 'Confirm removal' }))
  expect(await screen.findByText('1–25 of 25 participants')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
})
