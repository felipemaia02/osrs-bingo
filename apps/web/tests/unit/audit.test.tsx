import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { AppRouter } from '../../src/app/router'
import { fetchAuditLog } from '../../src/features/audit/api/auditApi'
import type { AuditEntry } from '../../src/features/audit/types'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import { renderApp } from '../render'

vi.mock('../../src/features/audit/api/auditApi', () => ({
  AUDIT_PAGE_SIZE: 50,
  fetchAuditLog: vi.fn(),
}))

const EVENT = { id: 'event-1', name: 'Autumn Bingo' } as BingoEvent

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'a1',
    at: new Date(Date.now() - 5 * 60_000).toISOString(),
    action: 'submission.accepted',
    actor: { kind: 'user', id: 'u1', name: 'Holy Hal', on_behalf_of: null },
    event_id: EVENT.id,
    team_id: null,
    resource: { type: 'submission', id: 's1', label: null },
    payload: {},
    ...overrides,
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchEvents).mockResolvedValue([EVENT])
})

it('lists entries with who, the translated action, what and the event', async () => {
  vi.mocked(fetchAuditLog).mockResolvedValue({
    items: [
      entry(),
      entry({
        id: 'a2',
        action: 'team.updated',
        actor: { kind: 'bot', id: 'k1', name: 'clan-bot', on_behalf_of: 'Hal' },
        resource: { type: 'team', id: 't1', label: 'Crabs' },
        payload: { name: 'Crabs', color: '#ff0000' },
      }),
    ],
    next_cursor: null,
  })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/audit')

  const table = await screen.findByRole('table')
  const [, accepted, edited] = within(table).getAllByRole('row')
  expect(accepted).toHaveTextContent('Holy Hal')
  expect(accepted).toHaveTextContent('Submission accepted')
  expect(accepted).toHaveTextContent('Submissions')
  expect(accepted).toHaveTextContent('5 minutes ago')
  expect(await within(accepted).findByText('Autumn Bingo')).toBeInTheDocument()
  expect(edited).toHaveTextContent('clan-botBot for Hal')
  expect(edited).toHaveTextContent('Team edited')
  expect(edited).toHaveTextContent('Crabs')

  await user.click(within(edited).getByRole('button', { name: '2 fields' }))
  expect(within(edited).getByText('#ff0000')).toBeInTheDocument()
})

it('filters by type and loads older entries', async () => {
  vi.mocked(fetchAuditLog)
    .mockResolvedValueOnce({ items: [entry()], next_cursor: 'cursor-1' })
    .mockResolvedValue({ items: [entry({ id: 'a3', action: 'event.created' })], next_cursor: null })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/audit')

  await user.click(await screen.findByRole('button', { name: 'Load more' }))
  await waitFor(() => expect(fetchAuditLog).toHaveBeenLastCalledWith(expect.anything(), 'cursor-1'))
  expect(await screen.findByText('Event created')).toBeInTheDocument()

  await user.selectOptions(screen.getByLabelText('Type'), 'submission')
  await waitFor(() =>
    expect(fetchAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ group: 'submission' }),
      null,
    ),
  )
})

it('says when nothing matches the filters', async () => {
  vi.mocked(fetchAuditLog).mockResolvedValue({ items: [], next_cursor: null })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/audit')

  expect(await screen.findByText('Nothing has been recorded yet.')).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Type'), 'card')
  expect(await screen.findByText('No entries match these filters.')).toBeInTheDocument()
})
