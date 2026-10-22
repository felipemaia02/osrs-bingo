import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { AppShell } from '../../src/components/common/AppShell'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent, EventStatus } from '../../src/features/events/types'
import { fetchPlayers } from '../../src/features/teams/api/teamsApi'
import { renderApp } from '../render'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const ADMIN = { id: 'admin', discord_id: '111', username: 'felps_', is_admin: true }
const PLAYER = { ...ADMIN, id: 'player', username: 'Zezima', is_admin: false }

function event(
  status: EventStatus,
  startOffset: number,
  endOffset: number,
  name = 'Autumn Bingo 2026',
): BingoEvent {
  return {
    id: `${status}-1`,
    name,
    description: null,
    status,
    start_at: new Date(Date.now() + startOffset).toISOString(),
    end_at: new Date(Date.now() + endOffset).toISOString(),
    created_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
  }
}

function mockEvents(active: BingoEvent[], draft: BingoEvent[] = []) {
  vi.mocked(fetchEvents).mockImplementation(async (status) =>
    status === 'active' ? active : status === 'draft' ? draft : [...active, ...draft],
  )
}

const running = event('active', -DAY_MS, 13 * DAY_MS + 22 * HOUR_MS + 30 * 60_000)

describe('App shell v2', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    vi.mocked(fetchSession).mockResolvedValue(ADMIN)
    mockEvents([running])
  })

  it('shows players only the Play group, with My submissions disabled', async () => {
    vi.mocked(fetchSession).mockResolvedValue(PLAYER)
    renderApp(<AppShell>Board content</AppShell>)

    const sidebar = screen.getByRole('navigation', { name: 'Primary navigation' })
    await waitFor(() => expect(within(sidebar).getByText('Play')).toBeInTheDocument())
    expect(within(sidebar).getByRole('link', { name: 'Board' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(sidebar).getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/events')
    const submissions = within(sidebar)
      .getByText('My submissions')
      .closest('[aria-disabled="true"]')
    expect(submissions).toHaveTextContent('Soon')
    expect(screen.queryByText('Ranking')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument()
    expect(fetchPlayers).not.toHaveBeenCalled()

    const bottomBar = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(within(bottomBar).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
    expect(within(bottomBar).getByText('Submissions · soon')).toBeInTheDocument()
  })

  it('groups administration, marks the current page and shows pending registrations', async () => {
    mockEvents([running], [event('draft', DAY_MS, 2 * DAY_MS, 'Winter 2026')])
    vi.mocked(fetchPlayers).mockResolvedValue({
      items: [],
      total: 0,
      offset: 0,
      limit: 1,
      counts: { pending: 4, unassigned: 3, assigned: 0 },
    })
    renderApp(<AppShell>Teams</AppShell>, '/admin/teams')

    const sidebar = screen.getByRole('navigation', { name: 'Primary navigation' })
    const teams = await within(sidebar).findByRole('link', { name: /Teams and registrations/ })
    expect(teams).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(teams).toHaveTextContent('4'))
    for (const name of ['Overview', 'Card catalog', 'Event boards', 'Administrators']) {
      expect(within(sidebar).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(within(sidebar).getByText('Ranking').closest('[aria-disabled="true"]')).not.toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Administration sections' })).toBeNull()

    const bottomBar = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(within(bottomBar).getByRole('link', { name: 'Admin' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('shows the wordmark, event pill with countdown, language control and account', async () => {
    renderApp(<AppShell>Board content</AppShell>)

    expect(screen.getAllByRole('link', { name: 'OSRS Bingo — home' })[0]).toHaveAttribute(
      'href',
      '/',
    )
    const pill = (
      await screen.findAllByRole('link', { name: 'Active event: Autumn Bingo 2026' })
    )[0]
    expect(pill).toHaveTextContent('Autumn Bingo 2026')
    expect(pill).toHaveTextContent('Active')
    expect(pill).toHaveTextContent('13 d 22 h')
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect((await screen.findAllByRole('button', { name: 'felps_ account' }))[0]).toHaveTextContent(
      'felps_',
    )
  })

  it.each([
    ['no active event', [], 'No active event'],
    [
      'an event that has not started',
      [event('active', 2 * DAY_MS + 60_000, 9 * DAY_MS)],
      'Starts in 2 d 0 h',
    ],
    [
      'an event past its scheduled end',
      [event('active', -9 * DAY_MS, -DAY_MS)],
      'Scheduled end reached',
    ],
  ])('shows a neutral state for %s', async (_, active, text) => {
    mockEvents(active)
    renderApp(<AppShell>Board content</AppShell>)
    expect((await screen.findAllByText(text))[0]).toBeInTheDocument()
  })

  it('switches language from the desktop control and the mobile menu', async () => {
    const user = userEvent.setup()
    renderApp(<AppShell>Board content</AppShell>)

    await user.click(screen.getByRole('button', { name: 'Portuguese' }))
    expect(screen.getAllByRole('link', { name: 'Tabuleiro' }).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Idioma: Português' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Espanhol' }))
    await waitFor(() => expect(i18n.language).toBe('es'))
    expect(screen.getAllByRole('link', { name: 'Tablero' }).length).toBeGreaterThan(0)
  })

  it('offers "Log in" to anonymous visitors', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null)
    renderApp(<AppShell>Board content</AppShell>)
    for (const link of await screen.findAllByRole('link', { name: 'Log in with Discord' })) {
      expect(link).toHaveAttribute('href', '/login')
    }
    expect(screen.queryByText('Play')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument()
  })
})
