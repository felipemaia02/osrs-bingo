import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import { AxiosError } from 'axios'
import { fetchUsers, changeRole } from '../../src/features/administration/api/administrationApi'
import { AppRouter } from '../../src/app/router'
import { fetchAdminBoard } from '../../src/features/boards/api/boardsApi'
import type { EventBoard } from '../../src/features/boards/types'
import { fetchCards } from '../../src/features/cards/api/cardsApi'
import type { CardSummary } from '../../src/features/cards/types'
import { fetchPlayers } from '../../src/features/teams/api/teamsApi'
import { renderApp } from '../render'

const USER = { id: 'admin', discord_id: '111', username: 'Administrator', is_admin: true }

beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(fetchUsers).mockResolvedValue({
    items: [{ ...USER, id: 'target', username: 'Player', is_admin: false }],
    total: 1,
    offset: 0,
    limit: 25,
    admin_count: 1,
  })
  await i18n.changeLanguage('en')
  vi.mocked(fetchSession).mockResolvedValue(USER)
  vi.mocked(fetchEvents).mockResolvedValue([])
})

it('redirects anonymous admin visitors to the dedicated login page', async () => {
  vi.mocked(fetchSession).mockResolvedValue(null)
  renderApp(<AppRouter />, '/admin/teams')
  expect(await screen.findByRole('heading', { name: 'Join the adventure' })).toBeInTheDocument()
})

it('blocks regular users from the private portal and navigation', async () => {
  vi.mocked(fetchSession).mockResolvedValue({ ...USER, is_admin: false })
  renderApp(<AppRouter />, '/admin')
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Only administrators can manage participants.',
  )
  expect(
    screen.queryByRole('navigation', { name: 'Administration sections' }),
  ).not.toBeInTheDocument()
})

it('routes an already authenticated administrator from login to the portal', async () => {
  renderApp(<AppRouter />, '/login')
  expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: 'Administration sections' })).toBeInTheDocument()
})

it('makes every overview card a complete navigation link', async () => {
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin')

  const destinations = [
    ['/admin/events', 'Create, activate and finish. Only one can be active.'],
    ['/admin/teams', 'Approve requests and build teams for the draft event.'],
    ['/admin/cards', 'Bosses, drops, progress weights and revisions.'],
    ['/admin/boards', 'Choose the board size, cards and positions for each event.'],
    ['/admin/administrators', 'App roles, independent of Discord.'],
  ]
  for (const [path, description] of destinations) {
    const text = await screen.findByText(description)
    expect(text.closest('a')).toHaveAttribute('href', path)
  }
  const ranking = screen.getByText('Compare teams and contributions. Not available yet.')
  expect(ranking.closest('a')).toBeNull()
  expect(ranking.closest('[aria-disabled="true"]')).not.toBeNull()

  await user.click(screen.getByText('Create, activate and finish. Only one can be active.'))
  expect(await screen.findByRole('button', { name: 'New event' })).toBeInTheDocument()
})

it('keeps event management out of the public event listing even for admins', async () => {
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/events')
  await screen.findByText('No events found.')
  expect(screen.queryByRole('button', { name: 'New event' })).not.toBeInTheDocument()
  const adminEvents = (await screen.findAllByRole('link', { name: 'Events' })).find(
    (link) => link.getAttribute('href') === '/admin/events',
  )
  await user.click(adminEvents!)
  expect(await screen.findByRole('button', { name: 'New event' })).toBeInTheDocument()
})

it('redirects the former team-management route to the protected portal', async () => {
  renderApp(<AppRouter />, '/teams')
  expect(await screen.findByRole('heading', { name: 'Teams and registrations', level: 1 })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Teams and registrations' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(screen.queryByRole('navigation', { name: 'Administration sections' })).toBeNull()
})

it('manages global administrators without event selection and confirms a grant', async () => {
  const user = userEvent.setup()
  vi.mocked(changeRole).mockImplementation(async () => {
    vi.mocked(fetchUsers).mockResolvedValue({
      items: [{ ...USER, id: 'target', username: 'Player' }],
      total: 1,
      offset: 0,
      limit: 25,
      admin_count: 1,
    })
    return { ...USER, id: 'target', username: 'Player' }
  })
  renderApp(<AppRouter />, '/admin/administrators')
  await user.click(await screen.findByRole('button', { name: 'Grant access to Player' }))
  expect(screen.queryByLabelText('Event')).not.toBeInTheDocument()
  expect(changeRole).not.toHaveBeenCalled()
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm change' }),
  )
  expect(await screen.findByText('Administrator access updated.')).toBeInTheDocument()
  expect(vi.mocked(changeRole).mock.calls[0][0]).toEqual({ userId: 'target', isAdmin: true })
  expect(
    await screen.findByRole('button', { name: 'Remove access from Player' }),
  ).toBeInTheDocument()
})

it('shows the last-administrator conflict without changing the role', async () => {
  const error = new AxiosError('conflict')
  error.response = {
    status: 409,
    data: { detail: 'Cannot remove the last administrator' },
  } as never
  vi.mocked(changeRole).mockRejectedValue(error)
  vi.mocked(fetchUsers).mockResolvedValue({
    items: [USER],
    total: 1,
    offset: 0,
    limit: 25,
    admin_count: 1,
  })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/administrators')
  await user.click(await screen.findByRole('button', { name: 'Remove access from Administrator' }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm change' }),
  )
  expect(await screen.findByText('At least one administrator must remain.')).toBeInTheDocument()
  expect(
    await screen.findByRole('button', { name: 'Remove access from Administrator' }),
  ).toBeInTheDocument()
})

it('does not request the user directory for a regular player', async () => {
  vi.mocked(fetchSession).mockResolvedValue({ ...USER, is_admin: false })
  renderApp(<AppRouter />, '/admin/administrators')
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(fetchUsers).not.toHaveBeenCalled()
})

describe('administration overview status', () => {
  const event = (id: string, status: 'active' | 'draft' | 'finished', name = id) => ({
    id,
    name,
    description: null,
    status,
    start_at: '2026-10-22T12:00:00Z',
    end_at: '2026-11-05T12:00:00Z',
    created_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
  })
  const card = (id: string, status: 'active' | 'retired') =>
    ({ id, status }) as unknown as CardSummary

  beforeEach(() => {
    const all = [
      event('a', 'active'),
      event('d', 'draft', 'Winter 2026'),
      event('f1', 'finished'),
      event('f2', 'finished'),
    ]
    vi.mocked(fetchEvents).mockImplementation(async (status) =>
      status ? all.filter((item) => item.status === status) : all,
    )
    vi.mocked(fetchPlayers).mockResolvedValue({
      items: [],
      total: 0,
      offset: 0,
      limit: 1,
      counts: { pending: 4, unassigned: 3, assigned: 0 },
    })
    vi.mocked(fetchCards).mockResolvedValue([
      ...Array.from({ length: 36 }, (_, index) => card(`c${index}`, 'active')),
      card('old', 'retired'),
    ])
    vi.mocked(fetchAdminBoard).mockResolvedValue({
      positions: Array.from({ length: 30 }),
    } as unknown as EventBoard)
  })

  it('shows real counts on each overview card', async () => {
    renderApp(<AppRouter />, '/admin')
    const cardFor = async (description: string) =>
      (await screen.findByText(description)).closest('a')!

    const events = await cardFor('Create, activate and finish. Only one can be active.')
    await waitFor(() => expect(events).toHaveTextContent('1 active1 draft2 finished'))
    const teams = await cardFor('Approve requests and build teams for the draft event.')
    await waitFor(() => expect(teams).toHaveTextContent('4 pending3 unassigned'))
    const cards = await cardFor('Bosses, drops, progress weights and revisions.')
    await waitFor(() => expect(cards).toHaveTextContent('36 active1 retired'))
    const boards = await cardFor('Choose the board size, cards and positions for each event.')
    await waitFor(() => expect(boards).toHaveTextContent('Winter 2026 · 30/36'))
    const admins = await cardFor('App roles, independent of Discord.')
    await waitFor(() => expect(admins).toHaveTextContent('1 administrator'))
  })

  it('hides a badge when its data is unavailable instead of inventing a number', async () => {
    vi.mocked(fetchCards).mockRejectedValue(new Error('offline'))
    vi.mocked(fetchEvents).mockImplementation(async (status) =>
      status === 'draft' ? [] : [event('a', 'active')],
    )
    renderApp(<AppRouter />, '/admin')

    const events = (
      await screen.findByText('Create, activate and finish. Only one can be active.')
    ).closest('a')!
    await waitFor(() => expect(events).toHaveTextContent('1 active'))
    expect(events).not.toHaveTextContent('draft')
    const cards = screen.getByText('Bosses, drops, progress weights and revisions.').closest('a')!
    expect(cards).not.toHaveTextContent(/\d/)
    const boards = screen
      .getByText('Choose the board size, cards and positions for each event.')
      .closest('a')!
    expect(boards).not.toHaveTextContent('/36')
    expect(screen.queryByText(/pending/)).not.toBeInTheDocument()
  })
})
