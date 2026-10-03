import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import { AxiosError } from 'axios'
import { fetchUsers, changeRole } from '../../src/features/administration/api/administrationApi'
import { AppRouter } from '../../src/app/router'
import { renderApp } from '../render'

const USER = { id: 'admin', discord_id: '111', username: 'Administrator', is_admin: true }

beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(fetchUsers).mockResolvedValue({
    items: [{ ...USER, id: 'target', username: 'Player', is_admin: false }],
    total: 1,
    offset: 0,
    limit: 25,
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
    ['/admin/events', 'Create events and manage their lifecycle. Only one event can be active.'],
    ['/admin/teams', 'Select an event to approve registrations and organize teams.'],
    [
      '/admin/administrators',
      'Choose application administrators. This setting applies to all events.',
    ],
    ['/admin/ranking', 'Compare teams and player contributions for a selected event.'],
  ]
  for (const [path, description] of destinations) {
    const text = await screen.findByText(description)
    expect(text.closest('a')).toHaveAttribute('href', path)
  }

  await user.click(
    screen.getByText('Create events and manage their lifecycle. Only one event can be active.'),
  )
  expect(await screen.findByRole('button', { name: 'Create event' })).toBeInTheDocument()
})

it('keeps event management out of the public event listing even for admins', async () => {
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/events')
  await screen.findByText('No events found.')
  expect(screen.queryByRole('button', { name: 'Create event' })).not.toBeInTheDocument()
  await user.click((await screen.findAllByRole('link', { name: 'Administration' }))[0])
  await user.click(
    within(screen.getByRole('navigation', { name: 'Administration sections' })).getByRole('link', {
      name: 'Events',
    }),
  )
  expect(await screen.findByRole('button', { name: 'Create event' })).toBeInTheDocument()
})

it('redirects the former team-management route to the protected portal', async () => {
  renderApp(<AppRouter />, '/teams')
  expect(
    await screen.findByRole('navigation', { name: 'Administration sections' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Teams and players' })).toBeInTheDocument()
})

it('manages global administrators without event selection and confirms a grant', async () => {
  const user = userEvent.setup()
  vi.mocked(changeRole).mockImplementation(async () => {
    vi.mocked(fetchUsers).mockResolvedValue({
      items: [{ ...USER, id: 'target', username: 'Player' }],
      total: 1,
      offset: 0,
      limit: 25,
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
  vi.mocked(fetchUsers).mockResolvedValue({ items: [USER], total: 1, offset: 0, limit: 25 })
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
