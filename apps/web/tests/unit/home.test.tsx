import { screen, within } from '@testing-library/react'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { HomePage } from '../../src/features/home/pages/HomePage'
import { fetchOwnTeamScore } from '../../src/features/scoring/api/scoringApi'
import type { TeamScore } from '../../src/features/scoring/types'
import { fetchOwnSubmissions } from '../../src/features/submissions/api/submissionsApi'
import { fetchOwnTeamHome } from '../../src/features/team/api/teamHomeApi'
import { fetchOwnRegistration } from '../../src/features/teams/api/teamsApi'
import { renderApp } from '../render'

vi.mock('../../src/features/team/api/teamHomeApi', () => ({ fetchOwnTeamHome: vi.fn() }))

const DAY_MS = 86_400_000
const EVENT: BingoEvent = {
  id: 'event-1',
  name: 'Autumn Bingo 2026',
  description: null,
  status: 'active',
  start_at: new Date(Date.now() - DAY_MS).toISOString(),
  end_at: new Date(Date.now() + 3 * DAY_MS + 60_000).toISOString(),
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

const SCORE = {
  event_id: EVENT.id,
  team_id: 'sa',
  team_name: 'Saradomin',
  team_color: '#2F5592',
  total: 55,
  completed_tiles: 3,
  tile_count: 9,
} as TeamScore

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchEvents).mockResolvedValue([EVENT])
})

describe('Home page (052)', () => {
  it('welcomes visitors with the event, how it works, login and the clan links', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null as never)
    renderApp(<HomePage />, '/')

    expect(
      await screen.findByRole('heading', { name: 'Welcome to OSRS Bingo', level: 1 }),
    ).toBeInTheDocument()
    const event = await screen.findByRole('region', { name: 'Current event' })
    expect(event).toHaveTextContent('Autumn Bingo 2026')
    expect(event).toHaveTextContent('Ends in 3 d')
    expect(within(event).getByRole('link', { name: 'Open board' })).toHaveAttribute(
      'href',
      '/board',
    )
    const how = screen.getByRole('region', { name: 'How it works' })
    expect(within(how).getAllByRole('listitem')).toHaveLength(4)
    expect(within(how).getByRole('link', { name: 'Log in with Discord' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(within(how).getByRole('link', { name: 'Clan Discord' })).toHaveAttribute(
      'href',
      'https://discord.gg/kBabY3QW6h',
    )
    expect(screen.queryByRole('region', { name: 'My team' })).toBeNull()
  })

  it('summarizes the own team and the next steps for a player on a team', async () => {
    vi.mocked(fetchSession).mockResolvedValue({
      id: 'user-1',
      discord_id: '1',
      username: 'Hal',
      is_admin: false,
    })
    vi.mocked(fetchOwnRegistration).mockResolvedValue({
      id: 'p1',
      event_id: EVENT.id,
      team_id: 'sa',
      display_name: 'Holy Hal',
      status: 'approved',
    } as never)
    vi.mocked(fetchOwnTeamScore).mockResolvedValue(SCORE)
    vi.mocked(fetchOwnTeamHome).mockResolvedValue({
      event_id: EVENT.id,
      team_id: 'sa',
      team_name: 'Saradomin',
      team_color: null,
      emblem_url: null,
      members: [
        {
          player_id: 'p1',
          display_name: 'Holy Hal',
          discord_username: 'hal',
          role: null,
          timezone: null,
          activity: null,
          position: 2,
          tied: false,
          points: 12.5,
          drop_count: 4,
        },
      ],
      recent_drops: [],
    })
    vi.mocked(fetchOwnSubmissions).mockResolvedValue({
      items: [],
      counts: { all: 5, pending: 2, accepted: 2, rejected: 1 },
    })
    renderApp(<HomePage />, '/')

    expect(
      await screen.findByRole('heading', { name: 'Welcome back, Hal', level: 1 }),
    ).toBeInTheDocument()
    const team = await screen.findByRole('region', { name: 'My team' })
    expect(team).toHaveTextContent('Saradomin')
    expect(team).toHaveTextContent('Score 55')
    expect(team).toHaveTextContent('Tiles done3/9')
    expect(await within(team).findByText('2nd')).toBeInTheDocument()
    expect(team).toHaveTextContent('My points12.5')
    expect(within(team).getByRole('link', { name: 'Open My team' })).toHaveAttribute(
      'href',
      '/team',
    )

    const next = screen.getByRole('region', { name: 'Next steps' })
    expect(await within(next).findByText('2 submissions waiting for review')).toBeInTheDocument()
    expect(within(next).getByText('1 submission rejected')).toBeInTheDocument()
    expect(within(next).getByRole('link', { name: 'Submit a drop' })).toBeInTheDocument()
    // Players on a team don't need the introduction.
    expect(screen.queryByRole('region', { name: 'How it works' })).toBeNull()
  })

  it('says when no event is running', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([])
    renderApp(<HomePage />, '/')

    const event = await screen.findByRole('region', { name: 'Current event' })
    expect(event).toHaveTextContent('No event is running right now.')
  })
})
