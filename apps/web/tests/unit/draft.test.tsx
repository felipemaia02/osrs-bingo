import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { DraftPreviewPage } from '../../src/features/draft/pages/DraftPreviewPage'
import { fetchDraftPreview } from '../../src/features/teams/api/teamsApi'
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

const PLAYERS = [
  player('Ironman Iris', {
    ehb_total: 845.2,
    boss_kc_total: 17950,
    timezone: 'America/New_York',
    activity: 'over_3h',
    alt_count: 1,
    buy_in_status: 'paid',
    teammates: ['Druid Duda'],
  }),
  player('Holy Hal', {
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

beforeEach(async () => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  await i18n.changeLanguage('en')
  vi.mocked(fetchEvents).mockResolvedValue([DRAFT])
  vi.mocked(fetchDraftPreview).mockResolvedValue({
    captains: [
      {
        team_id: 't1',
        team_name: 'Saradomin',
        color: '#2F5592',
        captain: 'felps_',
        captain_ehb: 1229.1,
      },
      { team_id: 't2', team_name: 'Guthix', color: null, captain: null, captain_ehb: null },
    ],
    players: PLAYERS,
  })
})

describe('Draft preview', () => {
  it('shows captains and the players still without a team', async () => {
    renderApp(<DraftPreviewPage />, '/admin/draft')

    expect(
      await screen.findByText('Administration · Winter Bingo 2026 · Draft'),
    ).toBeInTheDocument()
    const captains = await screen.findByRole('list', { name: 'Captains' })
    expect(within(captains).getByText('felps_')).toBeInTheDocument()
    expect(within(captains).getByText('Saradomin · EHB Σ 1,229.1')).toBeInTheDocument()
    expect(within(captains).getByText('No captain yet')).toBeInTheDocument()

    const iris = screen.getByRole('article', { name: 'Ironman Iris' })
    expect(within(iris).getByText('Paid')).toBeInTheDocument()
    expect(within(iris).getByText('845.2')).toBeInTheDocument()
    expect(within(iris).getByText('17,950')).toBeInTheDocument()
    expect(within(iris).getByText(/New York \(UTC/)).toBeInTheDocument()
    expect(within(iris).getByText('1 alt')).toBeInTheDocument()
    expect(within(iris).getByText('Druid Duda')).toBeInTheDocument()
    expect(
      within(screen.getByRole('article', { name: 'Holy Hal' })).getByText('Instructor'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('article', { name: 'Varrock Vic' })).getByText('Buy-in pending'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('article', { name: 'Old Nick' })).getAllByText('—'),
    ).toHaveLength(3)
    expect(screen.getByText('4 players available · captains not listed')).toBeInTheDocument()

    const names = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))
    expect(names).toEqual(['Ironman Iris', 'Holy Hal', 'Varrock Vic', 'Old Nick'])
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
    vi.mocked(fetchDraftPreview).mockResolvedValue({ captains: [], players: [] })
    const { unmount } = renderApp(<DraftPreviewPage />, '/admin/draft')
    expect(await screen.findByText('Every approved player has a team.')).toBeInTheDocument()
    unmount()

    vi.mocked(fetchEvents).mockResolvedValue([])
    renderApp(<DraftPreviewPage />, '/admin/draft')
    expect(await screen.findByText("There's no draft event to preview.")).toBeInTheDocument()
  })
})
