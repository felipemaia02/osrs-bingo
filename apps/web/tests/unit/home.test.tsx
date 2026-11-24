import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchPublicBoard } from '../../src/features/boards/api/boardsApi'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { HomePage } from '../../src/features/home/pages/HomePage'
import { fetchOwnTeamScore, fetchPodium } from '../../src/features/scoring/api/scoringApi'
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
    const event = await screen.findByRole('region', { name: 'Autumn Bingo 2026 is live' })
    expect(event).toHaveTextContent('Live now')
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

  it('says when no event is open', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([])
    renderApp(<HomePage />, '/')

    expect(await screen.findByText(/No event is open right now./)).toBeInTheDocument()
  })
})

const PLAYER = { id: 'p1', event_id: EVENT.id, team_id: null, display_name: 'Thunder Crab' }
const USER = { id: 'user-1', discord_id: '1', username: 'Crab', is_admin: false }
const DRAFT: BingoEvent = {
  ...EVENT,
  id: 'draft-1',
  name: 'Winter Bingo',
  status: 'draft',
  start_at: new Date(Date.now() + 5 * DAY_MS).toISOString(),
  end_at: new Date(Date.now() + 12 * DAY_MS).toISOString(),
}

describe('Events and rules on the home page (068)', () => {
  beforeEach(() => {
    vi.mocked(fetchSession).mockResolvedValue(USER)
    vi.mocked(fetchOwnRegistration).mockResolvedValue(null)
  })

  it('shows the active event in one line and the draft only as the join banner', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([DRAFT, EVENT])
    renderApp(<HomePage />, '/')

    expect(
      await screen.findByRole('region', { name: 'Autumn Bingo 2026 is live' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('region', { name: 'Registration open: Winter Bingo' }),
    ).toBeInTheDocument()
    // No separate card for the draft (068 revision 1).
    expect(screen.queryByRole('region', { name: 'Winter Bingo' })).toBeNull()
    expect(fetchEvents).toHaveBeenCalledWith(['active', 'draft'])
  })

  it('invites a player who has not joined from the banner', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([DRAFT])
    renderApp(<HomePage />, '/')

    const banner = await screen.findByRole('region', { name: 'Registration open: Winter Bingo' })
    expect(within(banner).getByRole('link', { name: 'Join the bingo' })).toHaveAttribute(
      'href',
      `/events/${DRAFT.id}/join`,
    )
    expect(banner).toHaveTextContent('Starts in 5 d')
  })

  it('asks visitors to log in to join', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null as never)
    vi.mocked(fetchEvents).mockResolvedValue([DRAFT])
    renderApp(<HomePage />, '/')

    const banner = await screen.findByRole('region', { name: 'Registration open: Winter Bingo' })
    expect(within(banner).getByRole('link', { name: 'Log in with Discord' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('offers joining an active event only when late join is on (037)', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([{ ...EVENT, late_join: true }])
    renderApp(<HomePage />, '/')

    const banner = await screen.findByRole('region', {
      name: 'Registration open: Autumn Bingo 2026',
    })
    expect(within(banner).getByRole('link', { name: 'Join the bingo' })).toHaveAttribute(
      'href',
      `/events/${EVENT.id}/join`,
    )
  })

  it('shows the registration in the banner once joined', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([DRAFT])
    vi.mocked(fetchOwnRegistration).mockResolvedValue({
      ...PLAYER,
      event_id: DRAFT.id,
      status: 'pending',
      account_id: 'acc-1',
      buy_in_status: 'pending',
    } as never)
    renderApp(<HomePage />, '/')

    expect(await screen.findByText('Registration pending approval')).toBeInTheDocument()
    expect(screen.getByText('Playing as')).toBeInTheDocument()
    expect(screen.getByText('Buy-in not paid yet')).toBeInTheDocument()
    const banner = screen.getByRole('region', { name: 'Registration open: Winter Bingo' })
    expect(banner).toHaveTextContent("You're registered.")
    expect(within(banner).queryByRole('link', { name: 'Join the bingo' })).toBeNull()
  })

  it('lets a removed player join again (047)', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([DRAFT])
    vi.mocked(fetchOwnRegistration).mockResolvedValue({
      ...PLAYER,
      event_id: DRAFT.id,
      status: 'removed',
    } as never)
    renderApp(<HomePage />, '/')

    const banner = await screen.findByRole('region', { name: 'Registration open: Winter Bingo' })
    expect(within(banner).getByRole('link', { name: 'Join the bingo' })).toBeInTheDocument()
  })

  it('shows the rules at a glance and opens all of them in a modal', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([
      {
        ...EVENT,
        buy_in: '5M gp',
        rules_text: 'Screenshots must show the chat timestamp.',
        rules_addenda: [{ text: 'Pets count once.', added_at: '2026-10-03T12:00:00Z' }],
      },
    ])
    vi.mocked(fetchPublicBoard).mockResolvedValue({ row_bonus: 50, column_bonus: 40 } as never)
    const user = userEvent.setup()
    renderApp(<HomePage />, '/')

    const rules = await screen.findByRole('region', { name: 'Rules' })
    expect(within(rules).getAllByRole('listitem')).toHaveLength(5)
    await user.click(within(rules).getByRole('button', { name: 'Read all rules' }))

    const dialog = screen.getByRole('dialog', { name: 'Rules' })
    expect(within(dialog).getByRole('region', { name: 'The basics' })).toBeInTheDocument()
    const scoring = within(dialog).getByRole('region', { name: 'Scoring' })
    expect(await within(scoring).findByText('+50')).toBeInTheDocument()
    expect(within(scoring).getByText('+40')).toBeInTheDocument()
    const own = within(dialog).getByRole('region', { name: 'Event rules' })
    expect(own).toHaveTextContent('Screenshots must show the chat timestamp.')
    expect(own).toHaveTextContent('Pets count once.')
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[0])
    expect(screen.queryByRole('dialog', { name: 'Rules' })).toBeNull()
  })

  it.each([
    ['pt', 'Inscrição aguardando aprovação'],
    ['es', 'Inscripción pendiente de aprobación'],
  ])('localizes the registration in %s', async (language, text) => {
    await i18n.changeLanguage(language)
    vi.mocked(fetchEvents).mockResolvedValue([DRAFT])
    vi.mocked(fetchOwnRegistration).mockResolvedValue({
      ...PLAYER,
      event_id: DRAFT.id,
      status: 'pending',
    } as never)
    renderApp(<HomePage />, '/')
    expect(await screen.findByText(text)).toBeInTheDocument()
  })
})

describe('Finished event podium (071)', () => {
  const FINISHED: BingoEvent = {
    ...EVENT,
    id: 'done-1',
    name: 'Summer Bingo',
    status: 'finished',
    finished_at: new Date(Date.now() - 2 * DAY_MS).toISOString(),
  }
  const team = (position: number, name: string, total: number) => ({
    position,
    tied: false,
    team_id: name.toLowerCase(),
    team_name: name,
    team_color: null,
    total,
    completed_tiles: position * 2,
    members: [`${name} player`],
  })
  const PODIUM = {
    event_id: FINISHED.id,
    event_name: FINISHED.name,
    start_at: FINISHED.start_at,
    end_at: FINISHED.end_at,
    finished_at: FINISHED.finished_at!,
    final: true,
    teams: [team(1, 'Saradomin', 320), team(2, 'Zamorak', 250), team(3, 'Guthix', 90)],
  }

  beforeEach(() => {
    vi.mocked(fetchSession).mockResolvedValue(null as never)
    vi.mocked(fetchEvents).mockImplementation(async (status) =>
      status === 'finished' ? [FINISHED] : [],
    )
  })

  it('celebrates the champion and the top 3 for everyone', async () => {
    vi.mocked(fetchPodium).mockResolvedValue(PODIUM)
    renderApp(<HomePage />, '/')

    const podium = await screen.findByRole('region', { name: 'Summer Bingo' })
    expect(podium).toHaveTextContent('Bingo finished')
    expect(podium).toHaveTextContent('Final results')
    const places = within(podium).getAllByRole('listitem')
    expect(places[0]).toHaveTextContent('ChampionSaradomin320')
    expect(places[1]).toHaveTextContent('2ndZamorak250')
    expect(places[2]).toHaveTextContent('3rdGuthix90')
    expect(fetchPodium).toHaveBeenCalledWith(FINISHED.id)
  })

  it('says results are being confirmed and shows the own team result', async () => {
    vi.mocked(fetchSession).mockResolvedValue({
      id: 'user-1',
      discord_id: '1',
      username: 'Hal',
      is_admin: false,
    })
    vi.mocked(fetchOwnRegistration).mockResolvedValue({
      id: 'p1',
      event_id: FINISHED.id,
      team_id: 'zamorak',
      display_name: 'Holy Hal',
      status: 'approved',
    } as never)
    vi.mocked(fetchOwnTeamScore).mockResolvedValue({
      ...SCORE,
      team_id: 'zamorak',
      team_name: 'Zamorak',
      total: 250,
    })
    vi.mocked(fetchPodium).mockResolvedValue({ ...PODIUM, final: false })
    renderApp(<HomePage />, '/')

    const podium = await screen.findByRole('region', { name: 'Summer Bingo' })
    expect(podium).toHaveTextContent('Results being confirmed')
    expect(
      await within(podium).findByText('Your team Zamorak finished 2nd with 250 pts.'),
    ).toBeInTheDocument()
  })

  it('stays hidden more than a week after the event finished', async () => {
    vi.mocked(fetchEvents).mockImplementation(async (status) =>
      status === 'finished'
        ? [{ ...FINISHED, finished_at: new Date(Date.now() - 8 * DAY_MS).toISOString() }]
        : [],
    )
    renderApp(<HomePage />, '/')

    expect(await screen.findByText(/No event is open right now./)).toBeInTheDocument()
    expect(fetchPodium).not.toHaveBeenCalled()
    expect(screen.queryByText('Bingo finished')).toBeNull()
  })
})
