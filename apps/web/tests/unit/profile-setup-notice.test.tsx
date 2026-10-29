import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { AppShell } from '../../src/components/common/AppShell'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchProfile } from '../../src/features/profiles/api/profileApi'
import type { LinkedAccount, Profile } from '../../src/features/profiles/types'
import { renderApp } from '../render'

const PLAYER = { id: 'player', discord_id: '222', username: 'Zezima', is_admin: false }
const ACCOUNT = { id: 'main', rsn: 'Zezima', is_main: true } as LinkedAccount

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    discord_id: PLAYER.discord_id,
    username: PLAYER.username,
    timezone: null,
    activity: null,
    accounts: [],
    totals: { boss_kc: 0, ehb: 0, counted: 0, total: 0, not_found: [] },
    ...overrides,
  }
}

const NOTICE = { name: 'Set up your profile' }

describe('Profile setup notice (046)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    sessionStorage.clear()
    await i18n.changeLanguage('en')
    vi.mocked(fetchSession).mockResolvedValue(PLAYER)
  })

  it('asks for the RSN and time zone and links to the profile', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(profile())
    renderApp(<AppShell>Board content</AppShell>)

    const notice = await screen.findByRole('region', NOTICE)
    expect(notice).toHaveTextContent('Link your RSN and choose your time zone')
    expect(screen.getByRole('link', { name: 'Go to my profile' })).toHaveAttribute(
      'href',
      '/profile',
    )
  })

  it('names only what is missing', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(profile({ accounts: [ACCOUNT] }))
    renderApp(<AppShell>Board content</AppShell>)

    const notice = await screen.findByRole('region', NOTICE)
    expect(notice).toHaveTextContent('Choose your time zone')
    expect(notice).not.toHaveTextContent('RSN')
  })

  it('stays hidden for complete profiles, on the profile page and for visitors', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(
      profile({ accounts: [ACCOUNT], timezone: 'Europe/London' }),
    )
    const complete = renderApp(<AppShell>Board content</AppShell>)
    await waitFor(() => expect(fetchProfile).toHaveBeenCalled())
    expect(screen.queryByRole('region', NOTICE)).toBeNull()
    complete.unmount()

    vi.mocked(fetchProfile).mockResolvedValue(profile())
    const onProfile = renderApp(<AppShell>Profile</AppShell>, '/profile')
    await waitFor(() => expect(fetchProfile).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('region', NOTICE)).toBeNull()
    onProfile.unmount()

    vi.mocked(fetchProfile).mockClear()
    vi.mocked(fetchSession).mockRejectedValue(new Error('Not signed in'))
    renderApp(<AppShell>Board content</AppShell>)
    await screen.findByText('Board content')
    expect(fetchProfile).not.toHaveBeenCalled()
  })

  it('hides for the rest of the session once closed', async () => {
    vi.mocked(fetchProfile).mockResolvedValue(profile())
    const user = userEvent.setup()
    const first = renderApp(<AppShell>Board content</AppShell>)

    await user.click(await screen.findByRole('button', { name: 'Hide this notice' }))
    expect(screen.queryByRole('region', NOTICE)).toBeNull()
    first.unmount()

    renderApp(<AppShell>Board content</AppShell>)
    await waitFor(() => expect(fetchProfile).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('region', NOTICE)).toBeNull()
  })
})
