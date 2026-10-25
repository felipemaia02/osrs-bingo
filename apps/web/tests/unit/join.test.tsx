import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { Route, Routes } from 'react-router-dom'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { JoinEventPage } from '../../src/features/join/pages/JoinEventPage'
import { fetchProfile, searchMembers } from '../../src/features/profiles/api/profileApi'
import type { LinkedAccount, Profile } from '../../src/features/profiles/types'
import * as teamsApi from '../../src/features/teams/api/teamsApi'
import { renderApp } from '../render'

const USER = { id: 'user-1', discord_id: '1', username: 'holy.hal', is_admin: false }
const EVENT: BingoEvent = {
  id: 'winter',
  name: 'Winter Bingo 2026',
  description: null,
  status: 'draft',
  start_at: '2026-12-10T12:00:00Z',
  end_at: '2026-12-24T12:00:00Z',
  rules_text: 'Only drops after the start count.',
  buy_in: '5M gp',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

function account(overrides: Partial<LinkedAccount>): LinkedAccount {
  return {
    id: 'main',
    rsn: 'Holy Hal',
    is_main: true,
    wom_status: 'found',
    total_level: 2198,
    ehp: 900,
    ehb: 702.5,
    boss_kc: 15230,
    combat: null,
    wom_updated_at: null,
    checked_at: null,
    wom_url: '',
    ...overrides,
  }
}

const PROFILE: Profile = {
  discord_id: '1',
  username: 'holy.hal',
  timezone: 'Europe/London',
  activity: 'one_to_three_h',
  accounts: [
    account({}),
    account({ id: 'iron', rsn: 'Hal Iron', is_main: false, ehb: 188, boss_kc: 4410 }),
    account({
      id: 'ghost',
      rsn: 'Hal Ghost',
      is_main: false,
      wom_status: 'not_found',
      boss_kc: null,
      ehb: null,
      total_level: null,
    }),
  ],
  totals: { boss_kc: 0, ehb: 0, counted: 2, total: 3, not_found: ['Hal Ghost'] },
}

function renderJoin() {
  return renderApp(
    <Routes>
      <Route path="/events/:eventId/join" element={<JoinEventPage />} />
      <Route path="/events" element={<p>Events list</p>} />
    </Routes>,
    `/events/${EVENT.id}/join`,
  )
}

function mobile() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
}

beforeEach(async () => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  await i18n.changeLanguage('en')
  vi.mocked(fetchSession).mockResolvedValue(USER)
  vi.mocked(fetchEvents).mockResolvedValue([EVENT])
  vi.mocked(fetchProfile).mockResolvedValue(PROFILE)
  vi.mocked(teamsApi.fetchOwnRegistration).mockResolvedValue(null)
  vi.mocked(searchMembers).mockResolvedValue([
    { user_id: 'u-monk', username: 'monk.mateus', main_rsn: 'Monk Mateus' },
    { user_id: 'u-mo', username: 'mo.fish', main_rsn: null },
  ])
})

describe('Join event', () => {
  it('joins with the main account, activity, teammates and agreements', async () => {
    vi.mocked(teamsApi.createPlayer).mockResolvedValue({
      id: 'p1',
      event_id: EVENT.id,
      team_id: null,
      display_name: 'Holy Hal',
      status: 'pending',
    })
    const user = userEvent.setup()
    renderJoin()

    expect(await screen.findByRole('heading', { name: 'Winter Bingo 2026' })).toBeInTheDocument()
    // The title shows before the profile loads; wait for the accounts themselves.
    const accounts = await screen.findByRole('radiogroup', { name: 'Bingo account' })
    expect(within(accounts).getByRole('radio', { name: /Holy Hal/ })).toBeChecked()
    expect(within(accounts).getByRole('radio', { name: /Hal Ghost/ })).toBeDisabled()
    expect(
      within(accounts).getByText('EHB 702.5 · Boss KC 15,230 · Total 2,198'),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '1 to 3 h/day' })).toBeChecked()
    expect(screen.getByText('Europe/London')).toBeInTheDocument()
    expect(screen.getByText('Only drops after the start count.')).toBeInTheDocument()
    expect(screen.getByText('5M gp')).toBeInTheDocument()

    const send = screen.getByRole('button', { name: 'Request to join' })
    expect(send).toBeDisabled()
    expect(screen.getByText(/Confirm all 3 items in step 3 first/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'More than 3 h/day' }))
    const search = screen.getByRole('combobox', { name: /Who would you like to team up with/ })
    await user.type(search, 'mo')
    await user.click(await screen.findByRole('option', { name: /Monk Mateus/ }))
    expect(screen.getByRole('button', { name: 'Remove Monk Mateus' })).toBeInTheDocument()
    expect(screen.getByText(/1 of 3/)).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: "I've read the bingo rules above." }))
    await user.click(screen.getByRole('checkbox', { name: /Only drops from Holy Hal/ }))
    await user.click(screen.getByRole('checkbox', { name: /I accept the team/ }))
    await user.click(send)

    expect(await screen.findByText('Events list')).toBeInTheDocument()
    expect(vi.mocked(teamsApi.createPlayer).mock.calls[0][0]).toEqual({
      eventId: EVENT.id,
      payload: {
        account_id: 'main',
        activity: 'over_3h',
        teammate_ids: ['u-monk'],
        accept_rules: true,
        accept_drop_account: true,
        accept_team: true,
      },
    })
  })

  it('leaves the buy-in out of events that have none', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([{ ...EVENT, buy_in: null }])
    renderJoin()

    expect(await screen.findByText('No buy-in for this event.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '4 · Send your request' })).toBeInTheDocument()
    expect(screen.queryByText('The buy-in is paid to an admin, who records it.')).toBeNull()
    expect(screen.queryByText('Not paid yet')).toBeNull()
  })

  it('limits teammates to three and keeps API errors on the page', async () => {
    const error = new AxiosError('failed')
    error.response = {
      status: 422,
      data: { detail: "This account isn't found on Wise Old Man" },
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
    vi.mocked(teamsApi.createPlayer).mockRejectedValue(error)
    vi.mocked(searchMembers).mockImplementation(async (term) => [
      { user_id: `u-${term}`, username: `${term}.discord`, main_rsn: `Friend ${term}` },
    ])
    const user = userEvent.setup()
    renderJoin()

    const search = await screen.findByRole('combobox', { name: /team up/ })
    for (const term of ['aa', 'bb', 'cc']) {
      await user.type(search, term)
      await screen.findByRole('option', { name: new RegExp(`Friend ${term}`) })
      await user.keyboard('{Enter}')
    }
    expect(search).toBeDisabled()
    expect(screen.getByText(/3 of 3/)).toBeInTheDocument()

    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
    await user.click(screen.getByRole('button', { name: 'Request to join' }))
    expect(
      await screen.findByText("This account isn't found on Wise Old Man. Update it in My profile."),
    ).toBeInTheDocument()
  })

  it('points to My profile when no account is found on Wise Old Man', async () => {
    vi.mocked(fetchProfile).mockResolvedValue({ ...PROFILE, accounts: [PROFILE.accounts[2]] })
    renderJoin()

    expect(
      await screen.findByText('Add an account found on Wise Old Man in My profile first.'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: 'Manage accounts in My profile' })[0],
    ).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('button', { name: 'Request to join' })).toBeDisabled()
  })

  it.each([
    [
      'an active event',
      () => vi.mocked(fetchEvents).mockResolvedValue([{ ...EVENT, status: 'active' }]),
      'Registrations are closed for this event.',
    ],
    [
      'an existing registration',
      () =>
        vi.mocked(teamsApi.fetchOwnRegistration).mockResolvedValue({
          id: 'p1',
          event_id: EVENT.id,
          team_id: null,
          display_name: 'Holy Hal',
          status: 'pending',
        }),
      "You've already requested to join this event.",
    ],
    [
      'a visitor',
      () => vi.mocked(fetchSession).mockResolvedValue(null),
      'Log in with Discord to join an event.',
    ],
  ])('explains why %s cannot join', async (_, arrange, message) => {
    arrange()
    renderJoin()

    expect(await screen.findByText(message, { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request to join' })).toBeNull()
  })

  it('walks through the steps as an accordion on mobile', async () => {
    mobile()
    const user = userEvent.setup()
    renderJoin()

    expect(await screen.findByRole('progressbar', { name: 'Step 1 of 4' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('progressbar', { name: 'Step 2 of 4' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Which account will you play with/ }),
    ).toHaveTextContent('Holy Hal · found on Wise Old Man')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    const next = screen.getByRole('button', { name: 'Next · confirm all 3' })
    expect(next).toBeDisabled()
    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('progressbar', { name: 'Step 4 of 4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request to join' })).toBeEnabled()
  })
})
