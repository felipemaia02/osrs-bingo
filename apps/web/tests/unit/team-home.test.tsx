import { screen, within } from '@testing-library/react'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { fetchOwnTeamScore } from '../../src/features/scoring/api/scoringApi'
import type { TeamScore } from '../../src/features/scoring/types'
import { fetchOwnTeamHome } from '../../src/features/team/api/teamHomeApi'
import { TeamHomePage } from '../../src/features/team/pages/TeamHomePage'
import type { TeamHome } from '../../src/features/team/types'
import { fetchOwnRegistration } from '../../src/features/teams/api/teamsApi'
import { renderApp } from '../render'

vi.mock('../../src/features/team/api/teamHomeApi', () => ({ fetchOwnTeamHome: vi.fn() }))

const EVENT: BingoEvent = {
  id: 'event-1',
  name: 'Autumn Bingo 2026',
  description: null,
  status: 'active',
  start_at: '2026-11-01T12:00:00Z',
  end_at: '2026-11-15T12:00:00Z',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

const SCORE: TeamScore = {
  event_id: EVENT.id,
  team_id: 'sa',
  team_name: 'Saradomin',
  team_color: '#2F5592',
  total: 55,
  tile_points: 30,
  completed_tiles: 3,
  tile_count: 9,
  bonus_points: 0,
  completed_bonus: 0,
  bonus_count: 0,
  completed_rows: [1],
  completed_columns: [],
  row_points: 25,
  column_points: 0,
  row_bonus: 25,
  column_bonus: 30,
  tiles: [],
  calculated_at: '2026-11-02T12:00:00Z',
}

const HOME: TeamHome = {
  event_id: EVENT.id,
  team_id: 'sa',
  team_name: 'Saradomin',
  team_color: '#2F5592',
  emblem_url: null,
  members: [
    {
      player_id: 'hal',
      display_name: 'Holy Hal',
      discord_username: 'hal',
      role: 'captain',
      timezone: 'Europe/London',
      activity: 'one_to_three_h',
      position: 1,
      tied: false,
      points: 30,
      drop_count: 3,
    },
    {
      player_id: 'amy',
      display_name: 'Amy',
      discord_username: null,
      role: null,
      timezone: null,
      activity: null,
      position: 2,
      tied: false,
      points: 3.3333,
      drop_count: 1,
    },
  ],
  recent_drops: [
    {
      submission_id: 's1',
      player_name: 'Holy Hal',
      card_name: 'Vorkath',
      drop_name: 'Vorkath Head',
      quantity: 1,
      points: 10,
      accepted_at: '2026-11-02T10:00:00Z',
    },
  ],
}

const PLAYER = { id: 'user-1', discord_id: '1', username: 'Hal', is_admin: false }

function registration(status: string, teamId: string | null) {
  return { id: 'p1', event_id: EVENT.id, team_id: teamId, display_name: 'Holy Hal', status }
}

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchSession).mockResolvedValue(PLAYER)
  vi.mocked(fetchEvents).mockResolvedValue([EVENT])
  vi.mocked(fetchOwnRegistration).mockResolvedValue(registration('approved', 'sa') as never)
  vi.mocked(fetchOwnTeamScore).mockResolvedValue(SCORE)
  vi.mocked(fetchOwnTeamHome).mockResolvedValue(HOME)
})

describe('team home (050)', () => {
  it('shows the team score, the members ranked by points, recent drops and the sheet', async () => {
    renderApp(<TeamHomePage />, '/team')

    expect(await screen.findByRole('heading', { name: 'Saradomin', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: "Your team's score" })).toHaveTextContent('55')

    const board = screen.getByRole('region', { name: 'Team leaderboard' })
    const rows = within(board).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('1stHoly HalCaptain330')
    expect(rows[1]).toHaveTextContent('2ndAmy13.33')

    const drops = screen.getByRole('region', { name: 'Recent drops' })
    expect(drops).toHaveTextContent('Vorkath Head')
    expect(drops).toHaveTextContent('Holy Hal · Vorkath')
    expect(drops).toHaveTextContent('+10 pts')

    const sheet = screen.getByRole('region', { name: 'Team sheet (2)' })
    expect(sheet).toHaveTextContent('London')
    expect(sheet).toHaveTextContent('1–3 h/day')
    expect(fetchOwnTeamHome).toHaveBeenCalledWith(EVENT.id)
  })

  it('tells players without a team and does not ask for a team page', async () => {
    vi.mocked(fetchOwnRegistration).mockResolvedValue(registration('pending', null) as never)
    renderApp(<TeamHomePage />, '/team')

    expect(await screen.findByText(/You don't have a team yet/)).toBeInTheDocument()
    expect(fetchOwnTeamHome).not.toHaveBeenCalled()
  })

  it('waits for the event to start', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([])
    renderApp(<TeamHomePage />, '/team')

    expect(
      await screen.findByText('Your team will be shown when the event starts.'),
    ).toBeInTheDocument()
    expect(fetchOwnTeamHome).not.toHaveBeenCalled()
  })
})
