import { screen, within } from '@testing-library/react'
import i18n from '../../src/lib/i18n'
import { AppRouter } from '../../src/app/router'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { fetchOwnRegistration } from '../../src/features/teams/api/teamsApi'
import type { ParticipantRole } from '../../src/features/teams/types'
import { renderApp } from '../render'

const EVENT = {
  id: 'event-1',
  name: 'Autumn Bingo',
  status: 'active',
  start_at: '2026-10-01T12:00:00Z',
  end_at: '2026-12-01T12:00:00Z',
} as BingoEvent

function playing(role: ParticipantRole | null) {
  vi.mocked(fetchOwnRegistration).mockResolvedValue({
    id: 'p1',
    event_id: EVENT.id,
    team_id: 'crabs',
    display_name: 'Holy Hal',
    status: 'approved',
    role,
  })
}

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchSession).mockResolvedValue({
    id: 'u1',
    discord_id: '1',
    username: 'Hal',
    is_admin: false,
  })
  vi.mocked(fetchEvents).mockResolvedValue([EVENT])
})

it.each(['captain', 'reviewer'] as const)(
  'a %s reviews the other teams from the Review page only (064)',
  async (role) => {
    playing(role)
    renderApp(<AppRouter />, '/admin/review')

    expect(
      await screen.findByText("You review the other teams' submissions, never your own team's."),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    expect(within(nav).getByRole('link', { name: 'Drop review' })).toBeInTheDocument()
    const adminLinks = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.startsWith('/admin'))
    expect(adminLinks).toEqual(['/admin/review'])
    // Reverting accepted submissions stays with administrators.
    expect(screen.queryByRole('radio', { name: /Accepted/ })).toBeNull()
  },
)

it('keeps the rest of the administration closed to reviewers', async () => {
  playing('reviewer')
  renderApp(<AppRouter />, '/admin/events')

  expect(
    await screen.findByRole('heading', { name: 'You need a higher level to enter' }),
  ).toBeInTheDocument()
})

it('players without a team role get no review access', async () => {
  playing(null)
  renderApp(<AppRouter />, '/admin/review')

  expect(
    await screen.findByRole('heading', { name: 'You need a higher level to enter' }),
  ).toBeInTheDocument()
})
