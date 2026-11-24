import { screen, within } from '@testing-library/react'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchPublicBoard } from '../../src/features/boards/api/boardsApi'
import type { EventBoard } from '../../src/features/boards/types'
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
    // Bars instead of a table (077 FR-003).
    const rows = within(board).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('1stHoly HalCaptain303 drops')
    expect(rows[1]).toHaveTextContent('2ndAmy3.331 drop')

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

describe('team dashboard (077)', () => {
  const card = (name: string) =>
    ({
      card_id: name,
      slug: name.toLowerCase(),
      card_revision: 1,
      name,
      description: null,
      difficulty: 'Mid',
      tile_score: 10,
      completion_requirement: 8,
      drops: [],
      wiki_image: null,
      fallback_image_accepted: true,
      rule_note: null,
    }) as never
  const NAMES = ['Vorkath', 'Zulrah', 'Hydra', 'Nex']
  const BOARD = {
    event_id: EVENT.id,
    status: 'published',
    revision: 1,
    size: 2,
    complete: true,
    created_at: EVENT.created_at,
    updated_at: EVENT.updated_at,
    published_at: EVENT.created_at,
    positions: NAMES.map((name, index) => ({
      position: index + 1,
      row: Math.floor(index / 2) + 1,
      column: (index % 2) + 1,
      card: card(name),
    })),
  } as EventBoard
  const tile = (position: number, progress: number) => ({
    position,
    row: Math.floor((position - 1) / 2) + 1,
    column: ((position - 1) % 2) + 1,
    bonus: false,
    progress,
    requirement: 8,
    complete: progress >= 8,
    points: progress >= 8 ? 10 : 0,
    drops: [],
  })

  it('shades the board map and lists the most advanced unfinished tiles', async () => {
    vi.mocked(fetchPublicBoard).mockResolvedValue(BOARD)
    vi.mocked(fetchOwnTeamScore).mockResolvedValue({
      ...SCORE,
      tile_count: 4,
      completed_rows: [],
      tiles: [tile(1, 8), tile(2, 2), tile(3, 6), tile(4, 0)],
    })
    renderApp(<TeamHomePage />, '/team')

    const map = await screen.findByRole('region', { name: 'Board map' })
    const squares = within(map).getByRole('list', { name: 'Tiles by progress' })
    expect(within(squares).getByText('Vorkath: complete')).toBeInTheDocument()
    expect(within(squares).getByText('Hydra: 6 of 8')).toBeInTheDocument()
    expect(within(squares).getByText('Nex: 0 of 8')).toBeInTheDocument()
    expect(within(map).getByRole('link', { name: 'Open board' })).toHaveAttribute('href', '/board')

    const next = screen.getByRole('region', { name: 'Next objectives' })
    const names = within(next)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('strong')?.textContent)
    // Complete and untouched tiles are left out; most advanced first.
    expect(names).toEqual(['Hydra', 'Zulrah'])
    expect(within(next).getByRole('progressbar', { name: 'Progress on Hydra' })).toHaveAttribute(
      'aria-valuenow',
      '75',
    )
  })
})
