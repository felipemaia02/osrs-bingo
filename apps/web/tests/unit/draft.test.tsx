import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { AppRouter } from '../../src/app/router'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { DraftBoard } from '../../src/features/draft/components/DraftBoard'
import { fetchDraftPreview, saveDraft } from '../../src/features/teams/api/teamsApi'
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
    role: 'reviewer',
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
  window.localStorage.clear()
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

const STORAGE_KEY = `osrs-bingo:draft:${DRAFT.id}`

function renderBoard(event: BingoEvent = DRAFT) {
  const actions = { onEdit: vi.fn(), onRemove: vi.fn() }
  renderApp(<DraftBoard event={event} actions={actions} />, '/admin/teams')
  return { actions, user: userEvent.setup() }
}

const team = (name: string) => screen.getByRole('region', { name })
const memberNames = (name: string) =>
  within(team(name))
    .queryAllByRole('listitem')
    .map((item) => item.querySelector('button[aria-label^="Details of"]')?.textContent)
    .filter(Boolean)

async function draft(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: `Draft ${name}` }))
}

describe('Draft board (076)', () => {
  it('shows the turn, the pool and each team with its captain', async () => {
    renderBoard()

    expect(await screen.findByText('Available pool (4)')).toBeInTheDocument()
    // In place, not a full-screen dialog (076 revision 1).
    expect(screen.getByRole('region', { name: 'Draft board' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('On the clock:Saradomin')
    expect(screen.getByText(/Round/).closest('span')).toHaveTextContent('Round 1 · Pick 1')
    const sara = team('Saradomin')
    expect(sara).toHaveAttribute('aria-current', 'true')
    expect(sara).toHaveTextContent('Captain: felps_')
    expect(sara).toHaveTextContent('#1felps_C')
    // Captains can't be sent back to the pool (BR-002).
    expect(within(sara).queryByRole('button', { name: /Return felps_/ })).toBeNull()
    expect(team('Guthix')).toHaveTextContent('No captain yet')
    const names = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))
    expect(names).toEqual(['Ironman Iris', 'Holy Hal', 'Varrock Vic', 'Old Nick'])
  })

  it('drafts in snake order, with undo and returning a pick', async () => {
    const { user } = renderBoard()

    await draft(user, 'Ironman Iris')
    await draft(user, 'Holy Hal')
    await draft(user, 'Varrock Vic')
    expect(memberNames('Saradomin')).toEqual(['felps_', 'Ironman Iris'])
    expect(memberNames('Guthix')).toEqual(['Holy Hal', 'Varrock Vic'])
    expect(screen.getByRole('status')).toHaveTextContent('On the clock:Saradomin')
    expect(screen.getByText('Available pool (1)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(memberNames('Guthix')).toEqual(['Holy Hal'])
    expect(screen.getByRole('status')).toHaveTextContent('On the clock:Guthix')

    await user.click(screen.getByRole('button', { name: 'Return Holy Hal to the pool' }))
    expect(memberNames('Guthix')).toEqual([])
    expect(screen.getByText('Available pool (3)')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('On the clock:Guthix')
  })

  it('reorders teams before the first pick and lets Prev/Next correct the turn', async () => {
    const { user } = renderBoard()

    await user.click(await screen.findByRole('button', { name: 'Move Guthix earlier' }))
    expect(screen.getByRole('status')).toHaveTextContent('On the clock:Guthix')
    await user.click(screen.getByRole('button', { name: 'Next team' }))
    expect(screen.getByRole('status')).toHaveTextContent('On the clock:Saradomin')
    await draft(user, 'Old Nick')
    expect(memberNames('Saradomin')).toEqual(['felps_', 'Old Nick'])
    // The order is fixed once picking started.
    expect(screen.queryByRole('button', { name: 'Move Guthix earlier' })).toBeNull()
  })

  it('saves every pick at once and lists players changed meanwhile', async () => {
    vi.mocked(saveDraft).mockResolvedValue({ changed: 1, skipped: ['Holy Hal'] })
    const { user } = renderBoard()

    expect(await screen.findByRole('button', { name: 'Save teams' })).toBeDisabled()
    await draft(user, 'Ironman Iris')
    await draft(user, 'Holy Hal')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).picks).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Save teams' }))

    expect(saveDraft).toHaveBeenCalledWith({
      eventId: DRAFT.id,
      assignments: [
        { player_id: 'Ironman Iris', from_team_id: null, team_id: 't1' },
        { player_id: 'Holy Hal', from_team_id: null, team_id: 't2' },
      ],
    })
    expect(await screen.findByText('1 player saved to their team.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Changed meanwhile, not saved: Holy Hal.')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('restores an unsaved draft from this browser and can discard it', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        order: ['t1', 't2'],
        picks: [{ playerId: 'Varrock Vic', teamId: 't1', slot: 0 }],
        released: [],
        history: [],
        manualTeamId: null,
      }),
    )
    const { user } = renderBoard()

    expect(await screen.findByText(/unsaved draft from this browser was restored/)).toBeVisible()
    expect(memberNames('Saradomin')).toEqual(['felps_', 'Varrock Vic'])
    await user.click(screen.getByRole('button', { name: 'Discard draft' }))
    const confirm = screen.getByRole('dialog', { name: 'Discard this draft?' })
    await user.click(within(confirm).getByRole('button', { name: 'Discard draft' }))
    expect(memberNames('Saradomin')).toEqual(['felps_'])
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('summarizes a team member on hover and opens the full details from the name', async () => {
    const { user } = renderBoard()

    await draft(user, 'Ironman Iris')
    const name = within(team('Saradomin')).getByRole('button', { name: 'Details of Ironman Iris' })
    await user.hover(name)
    const summary = await screen.findByRole('tooltip')
    expect(summary).toHaveTextContent('Ironman Iris')
    expect(summary).toHaveTextContent('845.2')
    expect(summary).toHaveTextContent('17,950')
    expect(summary).toHaveTextContent('2,277')
    expect(summary).toHaveTextContent('New York')
    expect(summary).toHaveTextContent('Click the name for all details')

    await user.click(name)
    expect(await screen.findByRole('dialog', { name: 'Ironman Iris' })).toBeInTheDocument()
  })

  it('edits and removes players from the board (ex Unassigned/Assigned tabs)', async () => {
    const { user, actions } = renderBoard()

    await user.click(await screen.findByRole('button', { name: 'Edit Holy Hal' }))
    expect(actions.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'Holy Hal' }))
    await user.click(screen.getByRole('button', { name: 'Remove Old Nick' }))
    expect(actions.onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'Old Nick' }))
    await user.click(within(team('Saradomin')).getByRole('button', { name: 'Edit felps_' }))
    expect(actions.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'felps_' }))
  })

  it('during the event only places players without a team (037)', async () => {
    const member = player('Varrock Vic', { team_id: 't2' })
    vi.mocked(fetchDraftPreview).mockResolvedValue({
      captains: TEAMS,
      players: PLAYERS.filter((item) => item.id !== 'Varrock Vic'),
      members: [CAPTAIN, member],
    })
    const { user } = renderBoard({ ...DRAFT, status: 'active' })

    expect(await screen.findByText(/only players without a team can be placed/)).toBeVisible()
    // Formed teams stay locked: no × on members from before.
    expect(screen.queryByRole('button', { name: 'Return Varrock Vic to the pool' })).toBeNull()
    await draft(user, 'Holy Hal')
    expect(
      within(team('Saradomin')).getByRole('button', { name: 'Return Holy Hal to the pool' }),
    ).toBeInTheDocument()
  })

  it('is read-only once the event finished', async () => {
    renderBoard({ ...DRAFT, status: 'finished' })
    expect(await screen.findByText('Available pool (4)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Draft / })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save teams' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Edit / })).toBeNull()
  })

  it('shows levels on the card and every account in the details', async () => {
    const { user } = renderBoard()

    const iris = await expand('Ironman Iris')
    expect(within(iris).getByText('2,277')).toBeInTheDocument()
    expect(within(iris).getByText(/New York \(UTC/)).toBeInTheDocument()
    await user.click(within(iris).getByRole('button', { name: 'All details' }))
    const dialog = screen.getByRole('dialog', { name: 'Ironman Iris' })
    expect(within(dialog).getByText('iris.btw')).toBeInTheDocument()
    expect(within(dialog).getByRole('article', { name: 'Iris Alt' })).toBeInTheDocument()
  })

  it('searches, filters and sorts the pool, including by skill level', async () => {
    const { user } = renderBoard()

    await screen.findByRole('article', { name: 'Ironman Iris' })
    await user.selectOptions(screen.getByLabelText('Region'), 'europe')
    await user.selectOptions(screen.getByLabelText('Sort by'), 'kc')
    const names = () =>
      screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))
    expect(names()).toEqual(['Varrock Vic', 'Holy Hal'])
    await user.type(screen.getByRole('searchbox', { name: /Search unpicked/ }), 'hal')
    expect(names()).toEqual(['Holy Hal'])

    await user.clear(screen.getByRole('searchbox', { name: /Search unpicked/ }))
    await user.selectOptions(screen.getByLabelText('Region'), 'all')
    await user.selectOptions(screen.getByLabelText('Skill'), 'slayer')
    expect(names()).toEqual(['Ironman Iris', 'Holy Hal'])
    expect(screen.getByRole('article', { name: 'Holy Hal' })).toHaveTextContent('Slayer 93')
  })

  it('asks for teams first when the event has none', async () => {
    vi.mocked(fetchDraftPreview).mockResolvedValue({ captains: [], players: PLAYERS, members: [] })
    renderBoard()
    expect(await screen.findByText('Create teams first, on the Teams tab.')).toBeInTheDocument()
  })

  it('sends the former draft page to the Draft tab of Teams, shown in place', async () => {
    vi.mocked(fetchSession).mockResolvedValue({
      id: 'admin',
      discord_id: '9',
      username: 'felps_',
      is_admin: true,
    })
    renderApp(<AppRouter />, '/admin/draft')

    const tab = await screen.findByRole('tab', { name: /Draft/ })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Available pool (4)')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Unassigned|Assigned/ })).toBeNull()
  })
})
