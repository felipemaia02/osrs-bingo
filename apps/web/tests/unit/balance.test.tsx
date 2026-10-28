import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { saveBossKcSettings } from '../../src/features/balance/api'
import { BossKcBreakdown } from '../../src/features/balance/components/BossKcBreakdown'
import { BossKcSettingsModal } from '../../src/features/balance/components/BossKcSettingsModal'
import { renderApp } from '../render'

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
})

describe('Boss KC (feature 039)', () => {
  it('breaks KC down per boss, marking raids and bosses that do not count', async () => {
    renderApp(
      <BossKcBreakdown
        name="Holy Hal"
        accounts={[
          {
            rsn: 'Holy Hal',
            is_main: true,
            bosses: { brutus: 3000, vorkath: 1500, chambers_of_xeric: 400 },
          },
          { rsn: 'Hal Iron', is_main: false, bosses: null },
        ]}
        onClose={() => undefined}
      />,
    )

    const main = await screen.findByRole('region', { name: 'Holy Hal' })
    const rows = within(main).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Brutus.*3,000$/),
      expect.stringMatching(/^Vorkath1,500$/),
      expect.stringMatching(/^Chambers Of Xeric.*400$/),
    ])
    await waitFor(() => expect(within(rows[0]).getByText('Not counted')).toBeInTheDocument())
    expect(within(rows[2]).getByText('Raid')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Hal Iron' })).getByText(/Not loaded yet/),
    ).toBeInTheDocument()
  })

  it('lets admins choose the bosses that do not count', async () => {
    vi.mocked(saveBossKcSettings).mockResolvedValue({
      excluded: ['brutus', 'vorkath'],
      raids: [],
      known: [],
    })
    const onSaved = vi.fn()
    const user = userEvent.setup()
    renderApp(<BossKcSettingsModal onSaved={onSaved} onClose={() => undefined} />)

    const brutus = await screen.findByRole('checkbox', { name: 'Brutus' })
    expect(brutus).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Vorkath' }))
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(() => expect(saveBossKcSettings).toHaveBeenCalledOnce())
    expect(vi.mocked(saveBossKcSettings).mock.calls[0][0]).toEqual(['brutus', 'vorkath'])
    expect(onSaved).toHaveBeenCalledWith('Boss KC settings saved; totals updated.')
  })
})
