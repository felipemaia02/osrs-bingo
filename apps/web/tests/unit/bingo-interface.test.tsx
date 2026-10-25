import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchPublicBoard } from '../../src/features/boards/api/boardsApi'
import type { BoardCardSnapshot, EventBoard } from '../../src/features/boards/types'
import { boardToTiles, isFiltering, matchTile } from '../../src/features/bingo/boardTiles'
import { initialsOf as tileInitials } from '../../src/lib/text/initials'
import { shortNameOf } from '../../src/lib/text/shortName'
import { HomePage } from '../../src/features/bingo/pages/HomePage'
import type { AcceptedDrop } from '../../src/features/cards/types'
import { fetchEvents, fetchMyEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { fetchOwnRegistration, fetchTeams } from '../../src/features/teams/api/teamsApi'
import { renderApp } from '../render'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

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
    kind: 'boss_group',
    difficulty: 'Mid',
    tile_score: 10,
    completion_requirement: 8,
    drops: [
      { ...drop('Granite Maul', 1), verification_note: 'Screenshot required' },
      drop('Jar of Stone', 3),
    ],
    rule_note: 'Any Slayer master task counts.',
    requires_preverification: true,
  },
  2: {
    name: 'Stone Collector',
    difficulty: 'High',
    tile_score: 20,
    drops: [drop('Stone jar', 2, ['Jar of Stone'])],
  },
  3: {
    name: 'Alchemical Hydra',
    difficulty: 'High',
    tile_score: 20,
    completion_requirement: 6,
    drops: [drop("Hydra's Claw", 3), drop("Tumeken's shadow", 4)],
  },
}

function makeBoard(size = 6): EventBoard {
  return {
    event_id: 'event-1',
    status: 'published',
    revision: 1,
    size,
    complete: true,
    created_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
    published_at: '2026-10-01T12:00:00Z',
    positions: Array.from({ length: size * size }, (_, index) => ({
      position: index + 1,
      row: Math.floor(index / size) + 1,
      column: (index % size) + 1,
      card: snapshot(index + 1, SPECIAL[index + 1]),
    })),
  }
}

const EVENT: BingoEvent = {
  id: 'event-1',
  name: 'Autumn Bingo 2026',
  description: null,
  status: 'active',
  start_at: new Date(Date.now() - DAY_MS).toISOString(),
  end_at: new Date(Date.now() + 13 * DAY_MS + 22 * HOUR_MS + 30 * 60_000).toISOString(),
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-03T12:00:00Z',
}

const SEARCH = 'Where does my drop count?'

/** Opens the board; players outside the event first see "My events" and browse it (026). */
async function renderBoard() {
  const rendered = renderApp(<HomePage />)
  const browse = await waitFor(
    () =>
      screen.queryByRole('button', { name: 'Browse board' }) ??
      screen.getByRole('heading', { name: EVENT.name, level: 1 }),
  )
  if (browse.tagName === 'BUTTON') fireEvent.click(browse)
  await screen.findByRole('heading', { name: EVENT.name, level: 1 })
  return rendered
}

/** Grid tile or list item (not the mini-map cell, whose name ends with "show in the list"). */
function tileButton(name: string) {
  const matches = screen
    .getAllByRole('button', { name: new RegExp(`^${name},`) })
    .filter((button) => !button.closest('[aria-label="Board mini-map"]'))
  expect(matches).toHaveLength(1)
  return matches[0]
}

function useMobileViewport() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
}

describe('first screen (feature 026)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    await i18n.changeLanguage('en')
    vi.mocked(fetchEvents).mockResolvedValue([EVENT])
    vi.mocked(fetchPublicBoard).mockResolvedValue(makeBoard())
    vi.mocked(fetchTeams).mockResolvedValue([])
    vi.mocked(fetchSession).mockResolvedValue({
      id: 'user-1',
      discord_id: '123',
      username: 'Player',
      is_admin: false,
    })
  })

  it('shows my events first when the player is not in the active event', async () => {
    const draft = { ...EVENT, id: 'winter', name: 'Winter Bingo', status: 'draft' as const }
    vi.mocked(fetchMyEvents).mockResolvedValue([draft])
    vi.mocked(fetchOwnRegistration).mockResolvedValue(null)
    renderApp(<HomePage />)

    expect(await screen.findByRole('heading', { name: 'My events', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText('Winter Bingo')).toBeInTheDocument()
    expect(screen.getByText("Active event — you're not playing in it.")).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '6 by 6 board' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Browse board' }))
    expect(await screen.findByRole('region', { name: '6 by 6 board' })).toBeInTheDocument()
  })

  it('opens the board directly for players in the active event', async () => {
    vi.mocked(fetchOwnRegistration).mockResolvedValue({
      id: 'p1',
      event_id: EVENT.id,
      team_id: null,
      display_name: 'Zezima',
      status: 'pending',
    })
    renderApp(<HomePage />)

    expect(await screen.findByRole('region', { name: '6 by 6 board' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'My events' })).toBeNull()
  })
})

describe('Board v2', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
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

  describe('helpers', () => {
    const [guardians, collector, hydra] = boardToTiles(makeBoard())

    it('matches names, drops and aliases ignoring case and accents, with the drop weight', () => {
      expect(matchTile(guardians, 'GROTESQUE', 'all')).toEqual({ matches: true, matchedDrop: null })
      expect(matchTile(guardians, 'jar of stone', 'all').matchedDrop).toEqual({
        name: 'Jar of Stone',
        progressWeight: 3,
      })
      expect(matchTile(collector, 'jar of stone', 'all').matchedDrop?.name).toBe('Stone jar')
      expect(matchTile(hydra, 'tumékén', 'all').matches).toBe(true)
      expect(matchTile(hydra, 'granite', 'all').matches).toBe(false)
    })

    it('combines search with the difficulty filter and builds initials', () => {
      expect(matchTile(guardians, 'jar', 'High').matches).toBe(false)
      expect(matchTile(collector, 'jar', 'High').matches).toBe(true)
      expect(isFiltering('  ', 'all')).toBe(false)
      expect(isFiltering('', 'Low')).toBe(true)
      expect(tileInitials('Alchemical Hydra')).toBe('AH')
      expect(tileInitials('DT2 Bosses')).toBe('DB')
      expect(shortNameOf('Moons of Peril')).toBe('Moons')
      expect(shortNameOf('The Gauntlet')).toBe('Gauntlet')
      expect(shortNameOf('DT2 Bosses')).toBe('DT2 Bosses')
      expect(shortNameOf('Vorkath')).toBe('Vorkath')
    })
  })

  describe('desktop', () => {
    it('renders the header, notice, toolbar, labeled grid and empty panel without progress', async () => {
      await renderBoard()

      expect(screen.getByText('Active event')).toBeInTheDocument()
      expect(screen.getByText('Ends in 13 d 22 h')).toBeInTheDocument()
      expect(
        await screen.findByText(/You're not in this event, so there's no team progress to show\./),
      ).toBeInTheDocument()
      expect(screen.queryByText(/Drop submissions don't exist yet/)).not.toBeInTheDocument()
      expect(screen.getByRole('searchbox', { name: SEARCH })).toBeInTheDocument()
      const grid = screen.getByRole('region', { name: '6 by 6 board' })
      expect(within(grid).getAllByRole('button')).toHaveLength(36)
      expect(tileButton('Grotesque Guardians').getAttribute('aria-label')).toBe(
        'Grotesque Guardians, row 1 column 1, Medium, 10 points',
      )
      expect(within(grid).getByRole('link', { name: 'OSRS Wiki' })).toBeInTheDocument()
      expect(screen.getByRole('complementary', { name: 'Tile detail' })).toHaveTextContent(
        'Select a tile to see its accepted drops',
      )
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('shows the selected tile in the fixed panel and returns to the prompt on close', async () => {
      const user = userEvent.setup()
      await renderBoard()

      await user.click(tileButton('Grotesque Guardians'))
      const panel = screen.getByRole('complementary', { name: 'Tile detail' })
      expect(
        within(panel).getByRole('heading', { name: 'Grotesque Guardians', level: 2 }),
      ).toBeInTheDocument()
      expect(panel).not.toHaveTextContent(/Row \d · Column \d/)
      expect(within(panel).getByText('Boss group')).toBeInTheDocument()
      expect(panel).toHaveTextContent(
        'Completes when progress reaches 8. Worth 10 pts only once — extra progress gives no points.',
      )
      expect(panel).toHaveTextContent(
        "You're not in this event, so there's no team progress to show.",
      )
      const maul = within(panel).getByText('Granite Maul').closest('li')!
      expect(within(maul).getByText('+1 progress')).toBeInTheDocument()
      expect(within(maul).getByText('Verification: Screenshot required')).toBeInTheDocument()
      expect(within(panel).getByText(/Any Slayer master task counts\./)).toBeInTheDocument()
      expect(tileButton('Grotesque Guardians')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('region', { name: '6 by 6 board' })).toBeInTheDocument()

      await user.click(within(panel).getByRole('button', { name: 'Close detail' }))
      expect(panel).toHaveTextContent('Select a tile to see its accepted drops')
    })

    it('highlights search matches in place and the matching drop in the panel', async () => {
      const user = userEvent.setup()
      await renderBoard()
      const order = screen.getAllByRole('button', { name: /, row \d column \d,/ }).map((b) => b.id)

      await user.type(screen.getByRole('searchbox', { name: SEARCH }), 'jar of stone')

      expect(screen.getByRole('status')).toHaveTextContent(
        '2 tiles accept “jar of stone” — the other 34 stay in place, dimmed.',
      )
      expect(tileButton('Grotesque Guardians')).toHaveTextContent('Jar of Stone +3')
      expect(tileButton('Grotesque Guardians').getAttribute('aria-label')).toMatch(
        /matches search: Jar of Stone \+3$/,
      )
      expect(screen.getAllByRole('button', { name: /does not match the search$/ })).toHaveLength(34)
      expect(
        screen.getAllByRole('button', { name: /, row \d column \d,/ }).map((b) => b.id),
      ).toEqual(order)

      await user.click(tileButton('Grotesque Guardians'))
      const panel = screen.getByRole('complementary', { name: 'Tile detail' })
      expect(within(panel).getByText('Jar of Stone').tagName).toBe('STRONG')
    })

    it('combines the difficulty filter with search and reports zero results', async () => {
      const user = userEvent.setup()
      await renderBoard()

      await user.click(screen.getByRole('button', { name: 'Hard' }))
      expect(screen.getByRole('status')).toHaveTextContent('2 Hard tiles')
      await user.type(screen.getByRole('searchbox', { name: SEARCH }), 'jar')
      expect(screen.getByRole('status')).toHaveTextContent('1 Hard tile accepts “jar”')
      await user.clear(screen.getByRole('searchbox', { name: SEARCH }))
      await user.click(screen.getByRole('button', { name: 'All' }))
      await user.type(screen.getByRole('searchbox', { name: SEARCH }), 'twisted bow')
      expect(screen.getByRole('status')).toHaveTextContent('0 tiles accept “twisted bow”')
      expect(screen.getAllByRole('button', { name: /, row \d column \d,/ })).toHaveLength(36)
    })

    it('shows the viewer team in the header card', async () => {
      vi.mocked(fetchOwnRegistration).mockResolvedValue({
        id: 'p1',
        event_id: EVENT.id,
        team_id: 'team-1',
        display_name: 'Zezima',
        status: 'approved',
      })
      vi.mocked(fetchTeams).mockResolvedValue([
        { id: 'team-1', event_id: EVENT.id, name: 'Saradomin', color: '#2F5592', member_count: 3 },
      ])
      await renderBoard()

      expect(await screen.findByText('Saradomin')).toBeInTheDocument()
      expect(screen.getByText('SA')).toBeInTheDocument()
      expect(screen.getByText('Your team')).toBeInTheDocument()
    })

    it.each([
      [
        { status: 'pending' as const, team_id: null },
        'Your registration is awaiting approval',
        "Your registration is waiting for an admin's approval.",
      ],
      [
        { status: 'approved' as const, team_id: null },
        'Approved, awaiting team assignment',
        "You'll see your team's progress once an admin puts you in a team.",
      ],
      [
        { status: 'removed' as const, team_id: null },
        'You are not participating in this event',
        'Your registration was removed by an admin.',
      ],
    ])(
      'shows a neutral team state and why progress is hidden (%o)',
      async (registration, message, reason) => {
        vi.mocked(fetchOwnRegistration).mockResolvedValue({
          id: 'p1',
          event_id: EVENT.id,
          display_name: 'Zezima',
          ...registration,
        })
        await renderBoard()
        expect(await screen.findByText(message)).toBeInTheDocument()
        expect(await screen.findByText(reason)).toBeInTheDocument()
      },
    )

    it('shows no team card to anonymous visitors', async () => {
      vi.mocked(fetchSession).mockResolvedValue(null)
      await renderBoard()
      await waitFor(() => expect(fetchSession).toHaveBeenCalled())
      expect(screen.queryByText('Your team')).not.toBeInTheDocument()
      expect(screen.getByText("Log in to see your team's progress.")).toBeInTheDocument()
      expect(fetchOwnRegistration).not.toHaveBeenCalled()
    })

    it('explains completion in a modal without bonus values', async () => {
      const user = userEvent.setup()
      await renderBoard()

      await user.click(screen.getByRole('button', { name: 'How tiles are completed' }))
      const dialog = screen.getByRole('dialog', { name: 'How tiles are completed' })
      expect(within(dialog).getByText(/aren't set for this board yet/)).toBeInTheDocument()
      expect(dialog.querySelector('ul')?.textContent).not.toMatch(/\d/)
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('switches to the list view, keeps the panel and remembers the choice', async () => {
      const user = userEvent.setup()
      const { unmount } = await renderBoard()

      await user.click(screen.getByRole('button', { name: 'List view' }))
      expect(screen.getByRole('heading', { name: 'Row 1', level: 2 })).toBeInTheDocument()
      await user.click(tileButton('Alchemical Hydra'))
      const panel = screen.getByRole('complementary', { name: 'Tile detail' })
      expect(within(panel).getByRole('heading', { name: 'Alchemical Hydra' })).toBeInTheDocument()
      expect(localStorage.getItem('osrs-bingo-board-view')).toBe('list')
      unmount()

      await renderBoard()
      expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('keeps working when browser storage is blocked', async () => {
      const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      const user = userEvent.setup()
      await renderBoard()
      await user.click(screen.getByRole('button', { name: 'List view' }))
      expect(screen.getByRole('heading', { name: 'Row 6', level: 2 })).toBeInTheDocument()
      getItem.mockRestore()
      setItem.mockRestore()
    })
  })

  it('draws the published board at its own size', async () => {
    vi.mocked(fetchPublicBoard).mockResolvedValue(makeBoard(3))
    await renderBoard()

    const grid = screen.getByRole('region', { name: '3 by 3 board' })
    expect(within(grid).getAllByRole('button')).toHaveLength(9)
  })

  describe('mobile', () => {
    it('shows short names and difficulty stars, with no tile open until one is tapped', async () => {
      useMobileViewport()
      const user = userEvent.setup()
      await renderBoard()

      expect(screen.getByText('Ends in').parentElement).toHaveTextContent('Ends in13 d 22 h')
      expect(
        (await screen.findAllByText(/You're not in this event, so there's no team progress/))
          .length,
      ).toBeGreaterThan(0)
      expect(screen.queryByRole('region', { name: '6 by 6 board' })).not.toBeInTheDocument()
      const map = screen.getByRole('region', { name: 'Board mini-map' })
      expect(within(map).getAllByRole('button')).toHaveLength(36)
      const hydra = within(map).getByRole('button', { name: /^Alchemical Hydra, row 1 column 3/ })
      expect(hydra).toHaveTextContent('Alchemical')
      expect(screen.queryByRole('heading', { level: 2, name: /^Row \d$/ })).toBeNull()
      expect(screen.queryByRole('region', { name: 'Tile detail' })).toBeNull()
      expect(screen.getByText('Tap a tile on the map to see its details here.')).toBeInTheDocument()
      expect(within(map).queryByText('M')).toBeNull()
      expect(within(map).getByText(/Bronze = Easy/)).toBeInTheDocument()

      // The mobile search waits behind a button (feature 026).
      expect(screen.queryByRole('searchbox')).toBeNull()
      await user.click(screen.getByRole('button', { name: 'Search drops' }))
      expect(screen.getByRole('searchbox', { name: SEARCH })).toHaveFocus()
      await user.type(screen.getByRole('searchbox', { name: SEARCH }), 'jar of stone')
      expect(within(map).getByText('2 accept “jar of stone”')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Close search' }))
      expect(screen.queryByRole('searchbox')).toBeNull()
      expect(within(map).queryByText('2 accept “jar of stone”')).toBeNull()

      await user.click(screen.getByRole('button', { name: 'Hard' }))
      expect(screen.getByRole('button', { name: 'Hard' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows a tapped tile below the map and moves with Next', async () => {
      useMobileViewport()
      const user = userEvent.setup()
      await renderBoard()

      const map = screen.getByRole('region', { name: 'Board mini-map' })
      const cell = within(map).getByRole('button', { name: /^Alchemical Hydra, row 1 column 3/ })
      await user.click(cell)
      expect(cell).toHaveAttribute('aria-pressed', 'true')
      const panel = screen.getByRole('region', { name: 'Tile detail' })
      expect(within(panel).getByRole('heading', { name: 'Alchemical Hydra' })).toBeInTheDocument()
      expect(panel).not.toHaveTextContent(/Row \d · Column \d/)
      expect(
        within(map).getByText('Tap a tile to see details below, tap again to close.'),
      ).toBeInTheDocument()
      expect(within(panel).getByText("Hydra's Claw").closest('li')).toHaveTextContent('+3 progress')
      expect(screen.queryByRole('dialog')).toBeNull()

      await user.click(within(panel).getByRole('button', { name: 'Next tile' }))
      expect(within(panel).getByRole('heading', { name: 'Objective 4' })).toBeInTheDocument()
      expect(cell).toHaveAttribute('aria-pressed', 'false')

      const next = within(map).getByRole('button', { pressed: true })
      await user.click(next)
      expect(screen.queryByRole('region', { name: 'Tile detail' })).toBeNull()

      await user.click(cell)
      await user.click(screen.getByRole('button', { name: 'Close tile' }))
      expect(screen.queryByRole('region', { name: 'Tile detail' })).toBeNull()
    })
  })

  it('keeps the unavailable-board state', async () => {
    vi.mocked(fetchPublicBoard).mockResolvedValue(null)
    renderApp(<HomePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Browse board' }))
    expect(
      await screen.findByText('The active event board is not available yet.'),
    ).toBeInTheDocument()
  })
})
