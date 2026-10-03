import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { LoginPage } from '../../src/features/auth/pages/LoginPage'
import { renderApp } from '../render'

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchSession).mockResolvedValue(null)
})

it('offers Discord login and public events without administrator controls', async () => {
  renderApp(<LoginPage />, '/login')
  expect(await screen.findByRole('link', { name: 'Log in with Discord' })).toHaveAttribute(
    'href',
    'http://localhost:8000/auth/discord/login',
  )
  expect(screen.getByRole('heading', { name: 'Join the adventure' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Explore events' })).toHaveAttribute('href', '/events')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})

it('continues to events for an existing session', async () => {
  vi.mocked(fetchSession).mockResolvedValue({
    id: 'user',
    discord_id: '123',
    username: 'Crab',
    is_admin: false,
  })
  renderApp(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/events" element={<p>Event destination</p>} />
    </Routes>,
    '/login',
  )
  expect(await screen.findByText('Event destination')).toBeInTheDocument()
})

it.each([
  ['failed', 'Discord login failed or expired. Please try again.'],
  ['unavailable', 'Discord login is not available yet. Please try again later.'],
])('explains OAuth %s errors without exposing provider details', async (reason, message) => {
  renderApp(<LoginPage />, `/login?login=${reason}`)
  expect(screen.getByRole('alert')).toHaveTextContent(message)
  expect(await screen.findByRole('link', { name: 'Log in with Discord' })).toBeInTheDocument()
})

it('retries a failed session request', async () => {
  vi.mocked(fetchSession).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(null)
  const user = userEvent.setup()
  renderApp(<LoginPage />, '/login')
  await user.click(await screen.findByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('link', { name: 'Log in with Discord' })).toBeInTheDocument()
})

it('localizes the page', async () => {
  await i18n.changeLanguage('pt')
  renderApp(<LoginPage />, '/login')
  expect(await screen.findByRole('link', { name: 'Entrar com Discord' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Entre na aventura' })).toBeInTheDocument()
})
