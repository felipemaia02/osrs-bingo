import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchPublicBoard } from '../../src/features/boards/api/boardsApi'
import type { BoardCardSnapshot, EventBoard } from '../../src/features/boards/types'
import { HomePage } from '../../src/features/bingo/pages/HomePage'
import {
  activateEvent,
  fetchEvents,
  updateEventRules,
} from '../../src/features/events/api/eventsApi'
import { AdminEventsPage } from '../../src/features/events/pages/AdminEventsPage'
import type { BingoEvent } from '../../src/features/events/types'
import { fetchOwnTeamScore, fetchRanking } from '../../src/features/scoring/api/scoringApi'
import { RankingPage } from '../../src/features/scoring/pages/RankingPage'
import type { Ranking, TeamScore } from '../../src/features/scoring/types'
import { fetchOwnRegistration } from '../../src/features/teams/api/teamsApi'
import { renderApp } from '../render'

const EVENT: BingoEvent = {
  id: 'event-1',
  name: 'Autumn Bingo 2026',
  description: null,
  status: 'active',
  start_at: '2026-10-01T12:00:00Z',
  end_at: '2026-12-01T12:00:00Z',
  rules_text: 'Drops only count during the event.\nOne screenshot per item.',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

function card(name: string): BoardCardSnapshot {
  return {
    card_id: name,
    slug: name.toLowerCase(),
    card_revision: 1,
    name,
    description: null,
    kind: 'boss',
    difficulty: 'Mid',
    tile_score: 10,
    completion_requirement: 8,
    drops: [
      {
        key: 'head',
        name: `${name} Head`,
        progress_weight: 1,
        aliases: [],
        verification_note: null,
        counting_restriction: null,
      },
    ],
    wiki_image: null,
    fallback_image_accepted: true,
    rule_note: null,
    provenance: {
      source: 'admin',
      source_ref: null,
      source_cells: [],
      derived_from_revision: null,
    },
  }
}

const NAMES = [
  'Vorkath',
  'Zulrah',
  'Cerberus',
  'Hydra',
  'Sire',
  'Kraken',
  'Barrows',
  'Gauntlet',
  'Corp',
]
const BOARD: EventBoard = {
  event_id: EVENT.id,
  status: 'published',
  revision: 1,
  size: 3,
  row_bonus: 25,
  column_bonus: 30,
  complete: true,
  created_at: EVENT.created_at,
  updated_at: EVENT.updated_at,
  published_at: EVENT.created_at,
  positions: NAMES.map((name, index) => ({
    position: index + 1,
    row: Math.floor(index / 3) + 1,
    column: (index % 3) + 1,
    card: card(name),
  })),
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
  tiles: [
    ...[1, 2, 3].map((position) => ({
      position,
      row: 1,
      column: position,
      bonus: false,
      progress: 8,
      requirement: 8,
      complete: true,
      points: 10,
      drops: [{ drop_key: 'head', drop_name: 'Head', count: 8, progress: 8 }],
    })),
    {
      position: 4,
      row: 2,
      column: 1,
      bonus: false,
      progress: 6,
      requirement: 8,
      complete: false,
      points: 0,
      drops: [{ drop_key: 'head', drop_name: 'Hydra Head', count: 6, progress: 6 }],
    },
  ],
  calculated_at: '2026-10-23T12:00:00Z',
}

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchSession).mockResolvedValue({
    id: 'u1',
    discord_id: '1',
    username: 'Holy Hal',
    is_admin: false,
  })
  vi.mocked(fetchEvents).mockResolvedValue([EVENT])
  vi.mocked(fetchPublicBoard).mockResolvedValue(BOARD)
  vi.mocked(fetchOwnTeamScore).mockRejectedValue(new Error('Not on a team'))
  // The viewer plays this event, so the first screen is its board (feature 026).
  vi.mocked(fetchOwnRegistration).mockResolvedValue({
    id: 'p1',
    event_id: EVENT.id,
    team_id: null,
    display_name: 'Holy Hal',
    status: 'approved',
  })
})

describe('team progress on the board', () => {
  it('shows the own team score and per-tile progress', async () => {
    vi.mocked(fetchOwnTeamScore).mockResolvedValue(SCORE)
    const user = userEvent.setup()
    renderApp(<HomePage />, '/')

    const panel = await screen.findByRole('region', { name: "Your team's score" })
    expect(panel).toHaveTextContent('Saradomin55')
    expect(panel).toHaveTextContent('Completed tiles (3 of 9)30')
    expect(panel).toHaveTextContent('Rows · 1 × 2525')
    expect(screen.queryByText(/Progress unavailable/)).toBeNull()

    const grid = screen.getByRole('region', { name: '3 by 3 board' })
    expect(within(grid).getAllByText('Complete +10')).toHaveLength(3)
    const hydra = within(grid).getByRole('button', { name: /^Hydra,/ })
    expect(hydra).toHaveAccessibleName(/progress 6 of 8/)
    expect(within(hydra).getByText('6 / 8')).toBeInTheDocument()

    await user.click(hydra)
    const detail = screen.getByRole('complementary', { name: 'Tile detail' })
    expect(detail).toHaveTextContent('Team progress: 6 of 8 · worth 10 pts once')
    expect(detail).toHaveTextContent('Hydra Head × 6')
  })

  it('keeps the notice for players without a team', async () => {
    renderApp(<HomePage />, '/')

    expect((await screen.findAllByText(/Progress unavailable/)).length).toBeGreaterThan(0)
    expect(screen.queryByRole('region', { name: "Your team's score" })).toBeNull()
  })
})

describe('board help', () => {
  it('explains this board line bonuses and shows the written rules', async () => {
    const user = userEvent.setup()
    renderApp(<HomePage />, '/')

    await user.click(await screen.findByRole('button', { name: 'How tiles are completed' }))
    const dialog = screen.getByRole('dialog', { name: 'How tiles are completed' })
    expect(dialog).toHaveTextContent(
      'Completing all 3 tiles of a row gives +25 points; of a column, +30 points.',
    )
    expect(within(dialog).getByText(/Drops only count during the event\./)).toBeInTheDocument()
  })
})

describe('bonus row on the board', () => {
  it('shows bonus cards under the grid and in the score panel', async () => {
    vi.mocked(fetchPublicBoard).mockResolvedValue({
      ...BOARD,
      bonus_slots: 1,
      positions: [
        ...BOARD.positions,
        { position: 10, row: 4, column: 1, bonus: true, card: card('Nex') },
      ],
    })
    vi.mocked(fetchOwnTeamScore).mockResolvedValue({
      ...SCORE,
      total: 75,
      bonus_points: 20,
      completed_bonus: 1,
      bonus_count: 1,
    })
    renderApp(<HomePage />, '/')

    const bonusRow = await screen.findByRole('group', { name: 'Bonus cards' })
    expect(
      within(bonusRow).getByRole('button', { name: /^Nex, bonus card, Medium/ }),
    ).toBeInTheDocument()
    const grid = screen.getByRole('region', { name: '3 by 3 board' })
    expect(within(grid).getAllByRole('button')).toHaveLength(10)
    expect(screen.getByRole('region', { name: "Your team's score" })).toHaveTextContent(
      'Bonus cards (1 of 1)20',
    )
  })
})

describe('private ranking', () => {
  const RANKING: Ranking = {
    event_id: EVENT.id,
    event_name: EVENT.name,
    event_status: 'active',
    size: 3,
    tile_count: 9,
    bonus_count: 0,
    row_bonus: 25,
    column_bonus: 30,
    calculated_at: '2026-10-23T12:00:00Z',
    teams: [
      {
        position: 1,
        tied: false,
        team_id: 'sa',
        team_name: 'Saradomin',
        team_color: null,
        member_count: 2,
        total: 167,
        tile_points: 125,
        completed_tiles: 12,
        completed_rows: 1,
        row_points: 25,
        completed_columns: 0,
        column_points: 0,
        bonus_points: 0,
        completed_bonus: 0,
      },
      {
        position: 2,
        tied: true,
        team_id: 'za',
        team_name: 'Zamorak',
        team_color: null,
        member_count: 1,
        total: 142,
        tile_points: 112,
        completed_tiles: 11,
        completed_rows: 0,
        row_points: 0,
        completed_columns: 1,
        column_points: 30,
        bonus_points: 0,
        completed_bonus: 0,
      },
      {
        position: 2,
        tied: true,
        team_id: 'gu',
        team_name: 'Guthix',
        team_color: null,
        member_count: 1,
        total: 142,
        tile_points: 117,
        completed_tiles: 11,
        completed_rows: 1,
        row_points: 25,
        completed_columns: 0,
        column_points: 0,
        bonus_points: 0,
        completed_bonus: 0,
      },
      {
        position: 4,
        tied: false,
        team_id: 'ba',
        team_name: 'Bandos',
        team_color: null,
        member_count: 0,
        total: 98,
        tile_points: 98,
        completed_tiles: 9,
        completed_rows: 0,
        row_points: 0,
        completed_columns: 0,
        column_points: 0,
        bonus_points: 0,
        completed_bonus: 0,
      },
    ],
    players: [
      { player_id: 'p1', display_name: 'felps_', team_id: 'sa', contribution: 3.25 },
      { player_id: 'p2', display_name: 'Holy Hal', team_id: 'sa', contribution: 10 / 3 },
      { player_id: 'p3', display_name: 'Chaos Caio', team_id: 'za', contribution: 0 },
    ],
  }

  it('ranks teams with shared positions and shows two-decimal contributions', async () => {
    vi.mocked(fetchSession).mockResolvedValue({
      id: 'a',
      discord_id: '2',
      username: 'felps_',
      is_admin: true,
    })
    vi.mocked(fetchRanking).mockResolvedValue(RANKING)
    const user = userEvent.setup()
    renderApp(<RankingPage />, '/admin/ranking')

    const [table] = await screen.findAllByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      '1st',
      '2nd (tie)',
      '2nd (tie)',
      '4th',
    ])
    expect(rows[0]).toHaveTextContent('12/9 tiles')
    expect(screen.getByText(/Line bonuses: row 25 · column 30/)).toBeInTheDocument()

    const contribution = screen.getByRole('region', { name: 'Individual contribution' })
    expect(contribution).toHaveTextContent('Holy Hal3.33')
    expect(contribution).toHaveTextContent('felps_3.25')
    await user.click(within(contribution).getByRole('button', { name: 'Zamorak' }))
    expect(contribution).toHaveTextContent('Chaos Caio0.00')
  })
})

describe('event rules', () => {
  const DRAFT: BingoEvent = {
    ...EVENT,
    id: 'draft-1',
    name: 'Winter Bingo',
    status: 'draft',
    rules_text: null,
  }

  beforeEach(() => {
    vi.mocked(fetchSession).mockResolvedValue({
      id: 'a',
      discord_id: '2',
      username: 'felps_',
      is_admin: true,
    })
    vi.mocked(fetchEvents).mockResolvedValue([DRAFT])
  })

  it('saves the written rules and explains a refused activation', async () => {
    vi.mocked(updateEventRules).mockResolvedValue({ ...DRAFT, rules_text: 'Be nice.' })
    vi.mocked(activateEvent).mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        data: { detail: 'Set the row and column bonuses on the board before activating' },
      } as never),
    )
    const user = userEvent.setup()
    renderApp(<AdminEventsPage />, '/admin/events')

    await user.click(await screen.findByRole('button', { name: 'Activate event · Winter Bingo' }))
    const confirm = screen.getByRole('dialog', { name: 'Activate event?' })
    await user.click(within(confirm).getByRole('button', { name: 'Activate' }))
    expect(
      await within(confirm).findByText(
        'Set the row and column bonuses in the board builder before activating the event.',
      ),
    ).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Rules · Winter Bingo' }))
    const dialog = screen.getByRole('dialog', { name: 'Rules · Winter Bingo' })
    await user.type(within(dialog).getByLabelText('Rules of the bingo'), '  Be nice.  ')
    await user.click(within(dialog).getByRole('button', { name: 'Save rules' }))

    await waitFor(() => expect(updateEventRules).toHaveBeenCalledOnce())
    expect(vi.mocked(updateEventRules).mock.calls[0][0]).toEqual({
      eventId: 'draft-1',
      rules: { rules_text: 'Be nice.' },
    })
    expect(await screen.findByText('Rules saved.')).toBeInTheDocument()
  })
})
