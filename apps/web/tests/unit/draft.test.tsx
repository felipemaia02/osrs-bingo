import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { DraftPreviewPage } from '../../src/features/draft/pages/DraftPreviewPage'
import { fetchDraftPreview, updatePlayer } from '../../src/features/teams/api/teamsApi'
import type { Player } from '../../src/features/teams/types'
import { renderApp } from '../render'

const DRAFT: BingoEvent = {
  id: 'winter',
  name: 'Winter Bingo 2026',
  description: null,
  status: 'draft',
  start_at: '2026-12-10T12:00:00Z',
  end_at: '2026-12-24T12:00:00Z',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

function player(name: string, extra: Partial<Player>): Player {
  return {
    id: name,
    event_id: DRAFT.id,
    team_id: null,
    display_name: name,
    status: 'approved',
    account_id: `acc-${name}`,
    buy_in_status: 'pending',
    teammates: [],
    alt_count: 0,
    ...extra,
  }
}

const MAIN = {
  id: 'acc-main',
  rsn: 'Ironman Iris',
  is_main: true,
  wom_status: 'found' as const,
  total_level: 2277,
  combat_level: 126,
  combat: {
    attack: 99,
    strength: 99,
    defence: 99,
    hitpoints: 99,
    ranged: 99,
    prayer: 99,
    magic: 99,
  },
  skills: { slayer: 96, agility: 99 },
  wikisync: {
    status: 'found' as const,
    quest_points: 300,
    quests_completed: 170,
    quests_total: 184,
    hard_diaries: 8,
    diaries: Array.from({ length: 12 }, (_, index) => ({
      region: `Region ${index + 1}`,
      easy: true,
      medium: true,
      hard: index < 8,
      elite: false,
    })),
    key_quests: [
      { code: 'WGS', name: 'While Guthix Sleeps', done: true },
      { code: 'DT2', name: 'Desert Treasure II - The Fallen Empire', done: true },
      { code: 'BMR', name: 'The Blood Moon Rises', done: false },
    ],
  },
  ehp: 1402.6,
  ehb: 700.2,
  boss_kc: 15000,
}
const ALT = {
  ...MAIN,
  id: 'acc-alt',
  rsn: 'Iris Alt',
  is_main: false,
  total_level: 1500,
  combat_level: null,
  combat: null,
  skills: null,
  wikisync: null,
}
const HAL = { ...MAIN, id: 'acc-hal', rsn: 'Holy Hal', skills: { slayer: 93 } }

const CAPTAIN = player('felps_', {
  team_id: 't1',
  role: 'captain',
  ehb_total: 1229.1,
  boss_kc_total: 20000,
})

const PLAYERS = [
  player('Ironman Iris', {
    account: MAIN,
    accounts: [MAIN, ALT],
    discord_username: 'iris.btw',
    ehb_total: 845.2,
    boss_kc_total: 17950,
    timezone: 'America/New_York',
    activity: 'over_3h',
    alt_count: 1,
    buy_in_status: 'paid',
    teammates: ['Druid Duda'],
  }),
  player('Holy Hal', {
    account: HAL,
    ehb_total: 702.5,
    boss_kc_total: 15230,
    timezone: 'Europe/London',
    activity: 'one_to_three_h',
    role: 'instructor',
  }),
  player('Varrock Vic', {
    ehb_total: 402,
    boss_kc_total: 18870,
    timezone: 'Europe/Berlin',
    activity: 'one_to_three_h',
  }),
  player('Old Nick', { account_id: null, buy_in_status: null, alt_count: null }),
]

const TEAMS = [
  {
    team_id: 't1',
    team_name: 'Saradomin',
    color: '#2F5592',
    captain: 'felps_',
    captain_ehb: 1229.1,
  },
  { team_id: 't2', team_name: 'Guthix', color: null, captain: null, captain_ehb: null },
]

beforeEach(async () => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  await i18n.changeLanguage('en')
  vi.mocked(fetchEvents).mockResolvedValue([DRAFT])
  vi.mocked(fetchDraftPreview).mockResolvedValue({
    captains: TEAMS,
    players: PLAYERS,
    members: [CAPTAIN],
  })
})

async function expand(name: string) {
  const card = await screen.findByRole('article', { name })
  await userEvent.click(within(card).getByRole('button', { name }))
  return card
}

describe('Draft preview', () => {
  it('shows total and combat levels on the card and every account in the details', async () => {
    const user = userEvent.setup()
    renderApp(<DraftPreviewPage />, '/admin/draft')

    const iris = await expand('Ironman Iris')
    expect(within(iris).getByRole('button', { name: 'Ironman Iris' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(within(iris).getByText('2,277')).toBeInTheDocument()
    expect(within(iris).getByText('126')).toBeInTheDocument()
    const skills = within(iris).getByLabelText('Combat levels')
    expect(within(skills).getByText('Str')).toBeInTheDocument()
    // Slayer sits with the combat levels (often a bingo requirement).
    expect(within(skills).getByTitle('Slayer').nextElementSibling).toHaveTextContent('96')
    expect(iris).toHaveTextContent('QP 300')
    expect(iris).toHaveTextContent('Key quests 2/3')
    expect(iris).not.toHaveTextContent('diaries')

    await user.click(within(iris).getByRole('button', { name: 'All details' }))
    const dialog = screen.getByRole('dialog', { name: 'Ironman Iris' })
    expect(within(dialog).getByText('iris.btw')).toBeInTheDocument()
    expect(within(dialog).getByText('Druid Duda')).toBeInTheDocument()
    const main = within(dialog).getByRole('article', { name: 'Ironman Iris' })
    expect(within(main).getByText('Plays the bingo')).toBeInTheDocument()
    expect(within(main).getByText('Strength')).toBeInTheDocument()
    expect(within(main).getByTitle('Slayer').nextElementSibling).toHaveTextContent('96')
    const quests = within(main).getByRole('region', { name: 'Quests' })
    expect(within(quests).getByText('Quests', { selector: 'dt' }).nextSibling).toHaveTextContent(
      '170/184',
    )
    expect(within(quests).getByTitle('The Blood Moon Rises: not complete')).toBeInTheDocument()
    const alt = within(dialog).getByRole('article', { name: 'Iris Alt' })
    expect(within(alt).getByText(/Not loaded yet/)).toBeInTheDocument()
    expect(within(alt).getByText('1,500')).toBeInTheDocument()
    expect(within(alt).queryByText('Plays the bingo')).toBeNull()
  })

  it('shows compact cards that expand, and the team rosters with captains', async () => {
    renderApp(<DraftPreviewPage />, '/admin/draft')

    expect(
      await screen.findByText('Administration · Winter Bingo 2026 · Draft'),
    ).toBeInTheDocument()
    const rosters = await screen.findByRole('complementary', { name: 'Team rosters' })
    const sara = within(rosters).getByRole('listitem', { name: 'Saradomin' })
    expect(within(sara).getByText('felps_')).toBeInTheDocument()
    expect(within(sara).getByText('Captain')).toBeInTheDocument()
    expect(sara).toHaveTextContent('1 player · EHB Σ 1,229.1 · Boss KC Σ 20,000')
    // Captains are moved on the Teams page (BR-003).
    expect(within(sara).queryByRole('combobox')).toBeNull()
    expect(within(rosters).getByRole('listitem', { name: 'Guthix' })).toHaveTextContent(
      'No captain yet',
    )

    const iris = screen.getByRole('article', { name: 'Ironman Iris' })
    expect(within(iris).getByText('Paid')).toBeInTheDocument()
    expect(within(iris).getByText('845.2')).toBeInTheDocument()
    expect(within(iris).getByText('17,950')).toBeInTheDocument()
    // Compact: no time zone or wishes until expanded (FR-001).
    expect(within(iris).queryByText(/New York \(UTC/)).toBeNull()
    await expand('Ironman Iris')
    expect(within(iris).getByText(/New York \(UTC/)).toBeInTheDocument()
    expect(within(iris).getByText('1 alt')).toBeInTheDocument()
    expect(within(iris).getByText('Druid Duda')).toBeInTheDocument()
    expect(
      within(screen.getByRole('article', { name: 'Holy Hal' })).getByText('Instructor'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('article', { name: 'Varrock Vic' })).getByText('Buy-in pending'),
    ).toBeInTheDocument()
    // Only one card open at a time.
    const nick = await expand('Old Nick')
    expect(within(iris).queryByText('1 alt')).toBeNull()
    expect(within(nick).getAllByText('—')).toHaveLength(6) // EHB, KC twice, raids, zone
    expect(screen.getByText('4 players available · captains not listed')).toBeInTheDocument()

    const names = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))
    expect(names).toEqual(['Ironman Iris', 'Holy Hal', 'Varrock Vic', 'Old Nick'])
  })

  it('assigns a player with the team dropdown and moves them into the roster', async () => {
    const user = userEvent.setup()
    const vic2 = player('Varrock Vic', { team_id: 't2', ehb_total: 402 })
    vi.mocked(updatePlayer).mockImplementation(async () => {
      // The server now has Vic on Guthix: the refresh after the save reads that.
      vi.mocked(fetchDraftPreview).mockResolvedValue({
        captains: TEAMS,
        players: PLAYERS.filter((item) => item.id !== vic2.id),
        members: [CAPTAIN, vic2],
      })
      return vic2
    })
    renderApp(<DraftPreviewPage />, '/admin/draft')

    const vic = await screen.findByRole('article', { name: 'Varrock Vic' })
    await user.selectOptions(within(vic).getByLabelText('Team for Varrock Vic'), 't2')

    expect(updatePlayer).toHaveBeenCalledWith({
      eventId: DRAFT.id,
      playerId: 'Varrock Vic',
      payload: { team_id: 't2' },
    })
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Varrock Vic' })).toBeNull())
    const guthix = screen.getByRole('listitem', { name: 'Guthix' })
    expect(within(guthix).getByText('Varrock Vic')).toBeInTheDocument()
    expect(guthix).toHaveTextContent('1 player · EHB Σ 402')
    expect(screen.getByText('3 players available · captains not listed')).toBeInTheDocument()
  })

  it('assigns a player dropped on a team (desktop drag-and-drop)', async () => {
    vi.mocked(updatePlayer).mockResolvedValue(player('Holy Hal', { team_id: 't1' }))
    renderApp(<DraftPreviewPage />, '/admin/draft')

    const hal = await screen.findByRole('article', { name: 'Holy Hal' })
    expect(hal).toHaveAttribute('draggable', 'true')
    const data = new Map<string, string>()
    const dataTransfer = {
      get types() {
        return [...data.keys()]
      },
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
    }
    fireEvent.dragStart(hal, { dataTransfer })
    const sara = screen.getByRole('listitem', { name: 'Saradomin' })
    fireEvent.dragOver(sara, { dataTransfer })
    fireEvent.drop(sara, { dataTransfer })

    await waitFor(() =>
      expect(updatePlayer).toHaveBeenCalledWith({
        eventId: DRAFT.id,
        playerId: 'Holy Hal',
        payload: { team_id: 't1' },
      }),
    )
  })

  it('takes a member back to the available list with "No team"', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchDraftPreview).mockResolvedValue({
      captains: [
        { team_id: 't2', team_name: 'Guthix', color: null, captain: null, captain_ehb: null },
      ],
      players: [],
      members: [player('Varrock Vic', { team_id: 't2' })],
    })
    vi.mocked(updatePlayer).mockImplementation(async () => {
      vi.mocked(fetchDraftPreview).mockResolvedValue({
        captains: [
          { team_id: 't2', team_name: 'Guthix', color: null, captain: null, captain_ehb: null },
        ],
        players: [player('Varrock Vic', {})],
        members: [],
      })
      return player('Varrock Vic', {})
    })
    renderApp(<DraftPreviewPage />, '/admin/draft')

    const guthix = await screen.findByRole('listitem', { name: 'Guthix' })
    await user.selectOptions(within(guthix).getByLabelText('Team for Varrock Vic'), '')

    expect(updatePlayer).toHaveBeenCalledWith({
      eventId: DRAFT.id,
      playerId: 'Varrock Vic',
      payload: { team_id: null },
    })
    expect(await screen.findByRole('article', { name: 'Varrock Vic' })).toBeInTheDocument()
  })

  it('puts the player back and explains when the pick fails', async () => {
    const user = userEvent.setup()
    vi.mocked(updatePlayer).mockRejectedValue(new Error('offline'))
    renderApp(<DraftPreviewPage />, '/admin/draft')

    const vic = await screen.findByRole('article', { name: 'Varrock Vic' })
    await user.selectOptions(within(vic).getByLabelText('Team for Varrock Vic'), 't1')

    expect(await screen.findByRole('alert')).toHaveTextContent("The pick wasn't saved")
    expect(screen.getByRole('article', { name: 'Varrock Vic' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('listitem', { name: 'Saradomin' })).queryByText('Varrock Vic'),
    ).toBeNull()
  })

  it('filters by region and activity and sorts by boss KC', async () => {
    const user = userEvent.setup()
    renderApp(<DraftPreviewPage />, '/admin/draft')

    await screen.findByRole('article', { name: 'Ironman Iris' })
    await user.selectOptions(screen.getByLabelText('Region'), 'europe')
    await user.selectOptions(screen.getByLabelText('Activity'), 'one_to_three_h')
    await user.selectOptions(screen.getByLabelText('Sort by'), 'kc')

    const names = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))
    expect(names).toEqual(['Varrock Vic', 'Holy Hal'])
    expect(screen.getByText('2 players available · captains not listed')).toBeInTheDocument()
  })

  it('filters by a skill level of the bingo account and shows it on the cards', async () => {
    const user = userEvent.setup()
    renderApp(<DraftPreviewPage />, '/admin/draft')

    await screen.findByRole('article', { name: 'Ironman Iris' })
    expect(screen.queryByLabelText('Min level')).toBeNull()
    await user.selectOptions(screen.getByLabelText('Skill'), 'slayer')

    expect(screen.getByLabelText('Min level')).toHaveValue(90)
    expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual([
      'Ironman Iris',
      'Holy Hal',
    ])
    expect(screen.getByRole('article', { name: 'Holy Hal' })).toHaveTextContent('Slayer 93')
    expect(
      screen.getByText(
        '2 players have no skill data yet — they need to “Update from WOM” on My profile.',
      ),
    ).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Min level'))
    await user.type(screen.getByLabelText('Min level'), '95')
    expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual([
      'Ironman Iris',
    ])
    expect(screen.getByRole('article', { name: 'Ironman Iris' })).toHaveTextContent('Slayer 96')
    expect(screen.getByText('1 player available · Slayer ≥ 95')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Skill'), 'any')
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.queryByText(/no skill data/)).toBeNull()
  })

  it('opens and closes presentation mode', async () => {
    const user = userEvent.setup()
    renderApp(<DraftPreviewPage />, '/admin/draft')

    await user.click(await screen.findByRole('button', { name: 'Presentation mode' }))
    expect(screen.getByRole('dialog', { name: 'Draft preview' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).toBeNull()

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
  })

  it('explains when there is no draft or everyone has a team', async () => {
    vi.mocked(fetchDraftPreview).mockResolvedValue({ captains: [], players: [], members: [] })
    const { unmount } = renderApp(<DraftPreviewPage />, '/admin/draft')
    expect(await screen.findByText('Every approved player has a team.')).toBeInTheDocument()
    unmount()

    vi.mocked(fetchEvents).mockResolvedValue([])
    renderApp(<DraftPreviewPage />, '/admin/draft')
    expect(await screen.findByText("There's no draft event to preview.")).toBeInTheDocument()
  })
})
