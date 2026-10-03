import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { AppShell } from '../../src/components/common/AppShell'
import { renderApp } from '../render'

describe('AppShell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('identifies the active board navigation and administration access', async () => {
    renderApp(<AppShell>Board content</AppShell>)

    expect(screen.getAllByRole('link', { name: 'Board' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect((await screen.findAllByRole('link', { name: 'Administration' }))[0]).toHaveAttribute(
      'href',
      '/admin',
    )
    expect(screen.getByText('Board content')).toBeInTheDocument()
  })

  it('updates application labels when the language changes', async () => {
    const user = userEvent.setup()
    renderApp(<AppShell>Board content</AppShell>)

    await user.click(screen.getByRole('button', { name: 'Portuguese' }))

    expect(screen.getAllByRole('link', { name: 'Tabuleiro' }).length).toBeGreaterThan(0)
    expect(screen.getByText('Bingo de Verão')).toBeInTheDocument()
  })
})
