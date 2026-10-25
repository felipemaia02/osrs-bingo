import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import {
  addAccount,
  fetchProfile,
  runAccountAction,
  savePreferences,
} from '../../src/features/profiles/api/profileApi'
import { ProfilePage } from '../../src/features/profiles/pages/ProfilePage'
import type { LinkedAccount, Profile } from '../../src/features/profiles/types'
import { renderApp } from '../render'

const USER = { id: 'user-1', discord_id: '336288077507198977', username: 'felps_', is_admin: false }

function account(overrides: Partial<LinkedAccount>): LinkedAccount {
  return {
    id: 'main',
    rsn: 'felps',
    is_main: true,
    wom_status: 'found',
    total_level: 2277,
    ehp: 1402.6,
    ehb: 918.4,
    boss_kc: 21340,
    combat: {
      attack: 99,
      strength: 98,
      defence: 90,
      hitpoints: 97,
      ranged: 95,
      prayer: 77,
      magic: 94,
    },
    wom_updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    checked_at: new Date().toISOString(),
    wom_url: 'https://wiseoldman.net/players/felps',
    ...overrides,
  }
}

function profile(accounts: LinkedAccount[], overrides: Partial<Profile> = {}): Profile {
  return {
    discord_id: USER.discord_id,
    username: USER.username,
    timezone: null,
    activity: null,
    accounts,
    totals: { boss_kc: 0, ehb: 0, counted: 0, total: accounts.length, not_found: [] },
    ...overrides,
  }
}

function apiError(status: number, detail: string): AxiosError {
  const error = new AxiosError('failed')
  error.response = {
    status,
    data: { detail },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

const MAIN = account({
  wikisync: {
    status: 'found',
    quest_points: 343,
    quests_completed: 184,
    quests_total: 184,
    hard_diaries: 1,
    diaries: [
      { region: 'Ardougne', easy: true, medium: true, hard: false, elite: false },
      { region: 'Karamja', easy: true, medium: true, hard: true, elite: true },
    ],
  },
})
const ALT = account({
  wikisync: { status: 'not_found', diaries: [] },
  id: 'alt',
  rsn: 'felps iron',
  is_main: false,
  total_level: 1985,
  boss_kc: 6915,
  wom_url: 'https://wiseoldman.net/players/felps%20iron',
})
const GHOST = account({
  id: 'ghost',
  rsn: 'felps skiller',
  is_main: false,
  wom_status: 'not_found',
  total_level: null,
  ehp: null,
  ehb: null,
  boss_kc: null,
  combat: null,
  wom_updated_at: null,
})

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchSession).mockResolvedValue(USER)
})

describe('My profile', () => {
  it('shows the Discord identity, accounts with WOM stats and the balance totals', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(
      profile([MAIN, ALT, GHOST], {
        totals: { boss_kc: 28255, ehb: 1229.1, counted: 2, total: 3, not_found: ['felps skiller'] },
      }),
    )
    renderApp(<ProfilePage />, '/profile')

    expect(await screen.findByText('Discord ID 336288077507198977')).toBeInTheDocument()
    expect(screen.getByText('Automatic · from your Discord login')).toBeInTheDocument()

    const main = screen.getByRole('article', { name: 'Main account felps' })
    expect(within(main).getByText('Main · default for bingo')).toBeInTheDocument()
    expect(within(main).getByText('Found on Wise Old Man')).toBeInTheDocument()
    expect(within(main).getByText('2,277')).toBeInTheDocument()
    expect(within(main).getByText('1,402.6')).toBeInTheDocument()
    expect(within(main).getByText('21,340')).toBeInTheDocument()
    expect(within(main).getByText(/Updated on Wise Old Man 2 hours ago/)).toBeInTheDocument()
    const combat = within(main).getByLabelText('Combat levels')
    expect(within(combat).getByText('Strength').nextSibling).toHaveTextContent('98')
    expect(within(combat).getByText('Prayer').nextSibling).toHaveTextContent('77')
    expect(within(main).getByRole('link', { name: 'Open profile on WOM' })).toHaveAttribute(
      'href',
      'https://wiseoldman.net/players/felps',
    )

    const quests = within(main).getByRole('region', { name: 'Quests & diaries' })
    expect(within(quests).getByText('Quest points').nextSibling).toHaveTextContent('343')
    expect(within(quests).getByText('Quests').nextSibling).toHaveTextContent('184/184')
    expect(within(quests).getByText('Hard diaries').nextSibling).toHaveTextContent('1/2')
    expect(within(quests).getByTitle('Karamja: Elite diary complete')).toBeInTheDocument()
    expect(within(quests).getByTitle('Ardougne: Hard diary not complete')).toBeInTheDocument()

    const alt = screen.getByRole('article', { name: 'Alt account felps iron' })
    expect(
      within(alt).getByText(/No WikiSync data. Install the WikiSync plugin/),
    ).toBeInTheDocument()
    expect(within(alt).getByText('Alt · experience only')).toBeInTheDocument()
    expect(within(alt).getByRole('button', { name: 'Make main' })).toBeInTheDocument()

    const ghost = screen.getByRole('article', { name: 'Alt account felps skiller' })
    expect(within(ghost).getByText('Not found on Wise Old Man')).toBeInTheDocument()
    expect(within(ghost).getByRole('button', { name: 'Track on WOM' })).toBeInTheDocument()
    expect(within(ghost).getByRole('button', { name: 'Remove' })).toBeInTheDocument()

    const balance = screen.getByRole('region', { name: 'Experience for team balance' })
    expect(within(balance).getByText('28,255')).toBeInTheDocument()
    expect(within(balance).getByText('1,229.1')).toBeInTheDocument()
    expect(
      within(balance).getByText('2 of 3 accounts counted · felps skiller not found'),
    ).toBeInTheDocument()
  })

  it('adds the first account as main and shows API errors inside the modal', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(profile([]))
    vi.mocked(addAccount)
      .mockRejectedValueOnce(apiError(409, 'This account is already linked to another player'))
      .mockResolvedValueOnce(profile([MAIN]))
    const user = userEvent.setup()
    renderApp(<ProfilePage />, '/profile')

    await user.click(await screen.findByRole('button', { name: 'Add account' }))
    const dialog = screen.getByRole('dialog', { name: 'Add account' })
    expect(
      within(dialog).getByText('Your first account becomes your main, the default for bingo.'),
    ).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('RuneScape name (RSN)'), 'felps')
    await user.click(within(dialog).getByRole('button', { name: 'Add account' }))

    expect(
      await within(dialog).findByText('This account is already linked to another player.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText('RuneScape name (RSN)')).toHaveValue('felps')

    await user.click(within(dialog).getByRole('button', { name: 'Add account' }))
    expect(await screen.findByText('felps added.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('article', { name: 'Main account felps' })).toBeInTheDocument()
    expect(vi.mocked(addAccount).mock.calls[0][0]).toBe('felps')
  })

  it('runs account actions and shows the refresh cooldown on the card', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(profile([MAIN, ALT]))
    vi.mocked(runAccountAction).mockImplementation(async ({ action }) => {
      if (action === 'refresh') throw apiError(429, 'Updated less than an hour ago')
      return profile([
        { ...ALT, is_main: true },
        { ...MAIN, is_main: false },
      ])
    })
    const user = userEvent.setup()
    renderApp(<ProfilePage />, '/profile')

    const main = await screen.findByRole('article', { name: 'Main account felps' })
    await user.click(within(main).getByRole('button', { name: 'Update from WOM' }))
    expect(
      await within(main).findByText('Updated less than an hour ago. Try again later.'),
    ).toBeInTheDocument()

    const alt = screen.getByRole('article', { name: 'Alt account felps iron' })
    await user.click(within(alt).getByRole('button', { name: 'Make main' }))
    expect(
      await screen.findByRole('article', { name: 'Main account felps iron' }),
    ).toBeInTheDocument()
    expect(vi.mocked(runAccountAction).mock.calls[1][0]).toEqual({
      accountId: 'alt',
      action: 'main',
    })
  })

  it('removes alts from the menu but never the main while alts exist', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(profile([MAIN, ALT]))
    vi.mocked(runAccountAction).mockResolvedValue(profile([MAIN]))
    const user = userEvent.setup()
    renderApp(<ProfilePage />, '/profile')

    const main = await screen.findByRole('article', { name: 'Main account felps' })
    expect(within(main).queryByRole('button', { name: 'More options for felps' })).toBeNull()

    const alt = screen.getByRole('article', { name: 'Alt account felps iron' })
    await user.click(within(alt).getByRole('button', { name: 'More options for felps iron' }))
    await user.click(screen.getByRole('menuitem', { name: 'Remove' }))

    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Alt account felps iron' })).toBeNull(),
    )
    expect(vi.mocked(runAccountAction).mock.calls[0][0]).toEqual({
      accountId: 'alt',
      action: 'remove',
    })
  })

  it('keeps the last stats when Wise Old Man is unavailable', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(profile([{ ...MAIN, wom_status: 'unavailable' }]))
    renderApp(<ProfilePage />, '/profile')

    const main = await screen.findByRole('article', { name: 'Main account felps' })
    expect(
      within(main).getByText("Couldn't reach Wise Old Man, try again later"),
    ).toBeInTheDocument()
    expect(within(main).getByText('21,340')).toBeInTheDocument()
  })

  it('saves the time zone and activity', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(profile([MAIN], { timezone: 'Europe/London' }))
    vi.mocked(savePreferences).mockResolvedValue(
      profile([MAIN], { timezone: 'America/Sao_Paulo', activity: 'one_to_three_h' }),
    )
    const user = userEvent.setup()
    renderApp(<ProfilePage />, '/profile')

    const save = await screen.findByRole('button', { name: 'Save preferences' })
    const zone = screen.getByLabelText('Time zone')
    expect(zone).toHaveValue('Europe/London')
    expect(save).toBeDisabled()
    expect(
      within(zone).getByRole('option', { name: /^Sao Paulo \(UTC−03:00\)$/ }),
    ).toBeInTheDocument()

    await user.selectOptions(zone, 'America/Sao_Paulo')
    await user.click(screen.getByRole('radio', { name: '1 to 3 h per day' }))
    await user.click(save)

    expect(await screen.findByText('Preferences saved.')).toBeInTheDocument()
    expect(vi.mocked(savePreferences).mock.calls[0][0]).toEqual({
      timezone: 'America/Sao_Paulo',
      activity: 'one_to_three_h',
    })
  })

  it("suggests the browser's time zone when none is saved", async () => {
    vi.mocked(fetchProfile).mockResolvedValue(profile([MAIN]))
    renderApp(<ProfilePage />, '/profile')

    const zone = await screen.findByLabelText('Time zone')
    expect(zone).toHaveValue(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(screen.getByText('Detected from your browser. Save to keep it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save preferences' })).toBeEnabled()
  })

  it('asks visitors to log in', async () => {
    vi.mocked(fetchSession).mockResolvedValue(null)
    renderApp(<ProfilePage />, '/profile')

    expect(await screen.findByText(/Log in to see your profile/)).toBeInTheDocument()
    expect(fetchProfile).not.toHaveBeenCalled()
  })
})
