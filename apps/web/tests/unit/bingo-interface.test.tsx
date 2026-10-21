import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchPublicBoard } from '../../src/features/boards/api/boardsApi'
import type { BoardCardSnapshot, EventBoard } from '../../src/features/boards/types'
import { boardToTiles, isFiltering, matchTile } from '../../src/features/bingo/boardTiles'
import { TileCard } from '../../src/features/bingo/components/TileCard'
import { HomePage } from '../../src/features/bingo/pages/HomePage'
import type { Tile } from '../../src/features/bingo/types'
import type { AcceptedDrop } from '../../src/features/cards/types'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { fetchOwnRegistration, fetchTeams } from '../../src/features/teams/api/teamsApi'
import { renderApp } from '../render'

const DAY_MS = 24 * 60 * 60 * 1000

function drop(name: string, weight: number, aliases: string[] = []): AcceptedDrop {
  return {
    key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    progress_weight: weight,
    aliases,
    verification_note: null,
    counting_restriction: null,
  }
}

function snapshot(index: number, overrides: Partial<BoardCardSnapshot> = {}): BoardCardSnapshot {
  return {
    card_id: `card-${index}`,
    slug: `card-${index}`,
    card_revision: 1,
    name: `Objective ${index}`,
    description: null,
    kind: 'boss',
    difficulty: 'Low',
    tile_score: 5,
    completion_requirement: 6,
    drops: [drop(`Common drop ${index}`, 1)],
    wiki_image: null,
    fallback_image_accepted: true,
    rule_note: null,
    provenance: {
      source: 'admin',
      source_ref: null,
      source_cells: [],
      derived_from_revision: null,
    },
    ...overrides,
  }
}

const SPECIAL: Record<number, Partial<BoardCardSnapshot>> = {
  1: {
    name: 'Grotesque Guardians',
    difficulty: 'Mid',
    tile_score: 10,
    completion_requirement: 8,
    drops: [
      { ...drop('Granite Maul', 1), verification_note: 'Screenshot required' },
      drop('Jar of Stone', 3),
    ],
    rule_note: 'Any Slayer master task counts.',
  },
  2: {
    name: 'Stone Collector',
    difficulty: 'High',
    tile_score: 20,
    drops: [drop('Stone jar', 2, ['Jar of Stone'])],
  },
  3: { name: 'Raids', difficulty: 'High', tile_score: 20, drops: [drop("Tumeken's shadow", 4)] },
}

function makeBoard(): EventBoard {
  return {
    event_id: 'event-1',
    status: 'published',
    revision: 1,
    complete: true,
    created_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
    published_at: '2026-10-01T12:00:00Z',
    positions: Array.from({ length: 36 }, (_, index) => ({
      position: index + 1,
      row: Math.floor(index / 6) + 1,
      column: (index % 6) + 1,
      card: snapshot(index + 1, SPECIAL[index + 1]),
    })),
  }
}

const EVENT: BingoEvent = {
  id: 'event-1',
  name: 'Summer Bingo',
  description: null,
  status: 'active',
  start_at: new Date(Date.now() - DAY_MS).toISOString(),
  end_at: new Date(Date.now() + 3 * DAY_MS + 60_000).toISOString(),
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-03T12:00:00Z',
}

const TILE: Tile = {
  id: 'test-tile',
  position: 1,
  row: 1,
  col: 1,
  name: 'Test objective',
  tier: 'Mid',
  points: 10,
  requirement: 8,
  progress: 3,
  drops: [],
  ruleNote: null,
}

async function renderBoard() {
  renderApp(<HomePage />)
  return screen.findByRole('heading', { name: 'Objectives', level: 2 })
}

describe('Bingo board', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    await i18n.changeLanguage('en')
    vi.mocked(fetchEvents).mockResolvedValue([EVENT])
    vi.mocked(fetchPublicBoard).mockResolvedValue(makeBoard())
    vi.mocked(fetchOwnRegistration).mockResolvedValue(null)
    vi.mocked(fetchTeams).mockResolvedValue([])
    vi.mocked(fetchSession).mockResolvedValue({
      id: 'user-1',
      discord_id: '123',
      username: 'Player',
      is_admin: false,
    })
  })

  describe('tile matching', () => {
    const tiles = boardToTiles(makeBoard())
    const [guardians, collector, raids] = tiles

    it('matches tile names, drop names and aliases ignoring case and accents', () => {
      expect(matchTile(guardians, 'GROTESQUE', 'all')).toEqual({ matches: true, matchedDrop: null })
      expect(matchTile(guardians, 'jar of stone', 'all')).toEqual({
        matches: true,
        matchedDrop: 'Jar of Stone',
      })
      expect(matchTile(collector, 'jar of stone', 'all')).toEqual({
        matches: true,
        matchedDrop: 'Stone jar',
      })
      expect(matchTile(raids, 'tumékén', 'all').matches).toBe(true)
      expect(matchTile(raids, 'granite', 'all').matches).toBe(false)
    })

    it('combines search with the difficulty filter', () => {
      expect(matchTile(guardians, 'jar', 'High').matches).toBe(false)
      expect(matchTile(collector, 'jar', 'High').matches).toBe(true)
      expect(isFiltering('  ', 'all')).toBe(false)
      expect(isFiltering('', 'Low')).toBe(true)
    })
  })

  it('communicates tile state and progress without relying only on color', () => {
    render(<TileCard tile={TILE} />)

    expect(screen.getByRole('article', { name: 'Test objective: In progress' })).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('10 pts')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Progress for Test objective' }),
    ).toHaveAttribute('aria-valuenow', '3')
  })

  it('replaces a failed image with the themed fallback', () => {
    const { container } = render(
      <TileCard tile={TILE} imageUrl="https://example.invalid/tile.png" />,
    )
    fireEvent.error(container.querySelector('img')!)
    expect(screen.getByText('Image unavailable')).toBeInTheDocument()
  })

  it('renders the labeled grid without invented progress or score', async () => {
    await renderBoard()

    const region = screen.getByLabelText('Scrollable Bingo board')
    expect(within(region).getAllByRole('button')).toHaveLength(36)
    expect(
      screen.getByRole('button', {
        name: 'Row 1, column 1: Grotesque Guardians, Medium, 10 points, Progress unavailable',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Progress unavailable')).toHaveLength(36)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/score summary|total/i)).not.toBeInTheDocument()
  })

  it('opens tile details with drops as progress and returns focus on close', async () => {
    const user = userEvent.setup()
    await renderBoard()
    const tile = screen.getByRole('button', { name: /Row 1, column 1: Grotesque Guardians/ })

    await user.click(tile)
    const dialog = screen.getByRole('dialog', { name: 'Grotesque Guardians' })
    expect(within(dialog).getByText('10 points when progress reaches 8')).toBeInTheDocument()
    const maul = within(dialog).getByText('Granite Maul').closest('li')!
    expect(within(maul).getByText('+1 progress')).toBeInTheDocument()
    expect(within(maul).getByText('Verification: Screenshot required')).toBeInTheDocument()
    expect(within(dialog).getByText('Any Slayer master task counts.')).toBeInTheDocument()
    expect(within(dialog).getByText('Image unavailable')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(tile).toHaveFocus()
  })

  it('highlights tiles where a searched drop counts without moving them', async () => {
    const user = userEvent.setup()
    await renderBoard()
    const before = screen.getAllByRole('button', { name: /^Row/ }).map((tile) => tile.textContent)

    await user.type(screen.getByLabelText('Search tiles or drops'), 'JAR OF STONE')

    expect(screen.getByText('2 matching tiles')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Grotesque Guardians.*Counts: Jar of Stone$/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Stone Collector.*Counts: Stone jar$/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Does not match the search$/ })).toHaveLength(34)
    const after = screen.getAllByRole('button', { name: /^Row/ }).map((tile) => tile.textContent)
    expect(after.map((text) => text?.includes('Objective'))).toEqual(
      before.map((text) => text?.includes('Objective')),
    )

    await user.clear(screen.getByLabelText('Search tiles or drops'))
    expect(screen.queryByText(/matching tile/)).not.toBeInTheDocument()
  })

  it('dims tiles outside the difficulty filter and combines it with search', async () => {
    const user = userEvent.setup()
    await renderBoard()

    await user.click(screen.getByRole('button', { name: 'Hard' }))
    expect(screen.getByRole('button', { name: 'Hard' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('2 matching tiles')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Row/ })).toHaveLength(36)

    await user.type(screen.getByLabelText('Search tiles or drops'), 'jar')
    expect(screen.getByText('1 matching tile')).toBeInTheDocument()
  })

  it('shows a search with no results without hiding the board', async () => {
    const user = userEvent.setup()
    await renderBoard()
    await user.type(screen.getByLabelText('Search tiles or drops'), 'twisted bow')
    expect(screen.getByText('0 matching tiles')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Row/ })).toHaveLength(36)
  })

  it('shows the schedule, remaining time and the viewer team', async () => {
    vi.mocked(fetchOwnRegistration).mockResolvedValue({
      id: 'p1',
      event_id: EVENT.id,
      team_id: 'team-1',
      display_name: 'Zezima',
      status: 'approved',
    })
    vi.mocked(fetchTeams).mockResolvedValue([
      { id: 'team-1', event_id: EVENT.id, name: 'Crabs', color: '#AA3300', member_count: 3 },
    ])
    await renderBoard()

    expect(await screen.findByText('Your team: Crabs')).toBeInTheDocument()
    expect(screen.getByText('Ends in 3 days')).toBeInTheDocument()
    expect(screen.getByText(/—/)).toBeInTheDocument()
  })

  it.each([
    [{ status: 'pending' as const, team_id: null }, 'Your registration is awaiting approval'],
    [{ status: 'approved' as const, team_id: null }, 'Approved, awaiting team assignment'],
    [{ status: 'removed' as const, team_id: null }, 'You are not participating in this event'],
  ])('shows a neutral registration state (%o)', async (registration, message) => {
    vi.mocked(fetchOwnRegistration).mockResolvedValue({
      id: 'p1',
      event_id: EVENT.id,
      display_name: 'Zezima',
      ...registration,
    })
    await renderBoard()
    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('shows nothing about teams to anonymous visitors', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null)
    await renderBoard()
    await waitFor(() => expect(fetchSession).toHaveBeenCalled())
    expect(
      screen.queryByText(/^Your team:|not registered|awaiting|not participating/),
    ).not.toBeInTheDocument()
    expect(fetchOwnRegistration).not.toHaveBeenCalled()
  })

  it('explains completion without bonus values', async () => {
    const user = userEvent.setup()
    await renderBoard()
    await user.click(screen.getByText('How tiles are completed'))

    const help = screen.getByText('How tiles are completed').closest('details')!
    expect(within(help).getByText(/defined by the event rules/)).toBeVisible()
    expect(help.textContent).not.toMatch(/\d/)
  })

  it('switches to the row list and remembers the choice', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp(<HomePage />)
    await screen.findByRole('heading', { name: 'Objectives', level: 2 })

    await user.click(screen.getByRole('button', { name: 'List view' }))
    expect(screen.getByRole('heading', { name: 'Row 1', level: 3 })).toBeInTheDocument()
    expect(screen.queryByLabelText('Scrollable Bingo board')).not.toBeInTheDocument()
    expect(localStorage.getItem('osrs-bingo-board-view')).toBe('list')
    unmount()

    await renderBoard()
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('defaults to the list on small screens and survives unavailable storage', async () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true })
    vi.stubGlobal('matchMedia', matchMedia)
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const user = userEvent.setup()
    await renderBoard()

    expect(screen.getByRole('heading', { name: 'Row 6', level: 3 })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Grid view' }))
    expect(screen.getByLabelText('Scrollable Bingo board')).toBeInTheDocument()

    getItem.mockRestore()
    setItem.mockRestore()
    vi.unstubAllGlobals()
  })

  it('keeps the existing unavailable states', async () => {
    vi.mocked(fetchPublicBoard).mockResolvedValue(null)
    renderApp(<HomePage />)
    expect(
      await screen.findByText('The active event board is not available yet.'),
    ).toBeInTheDocument()

    vi.mocked(fetchEvents).mockResolvedValue([])
  })
})
