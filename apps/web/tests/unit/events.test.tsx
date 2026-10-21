import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import dayjs from 'dayjs'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { activateEvent, createEvent, fetchEvents } from '../../src/features/events/api/eventsApi'
import { ActiveEventIndicator } from '../../src/features/events/components/ActiveEventIndicator'
import { EventScheduleFields } from '../../src/features/events/components/EventScheduleFields'
import { EventsPage } from '../../src/features/events/pages/EventsPage'
import type { BingoEvent } from '../../src/features/events/types'
import { renderApp } from '../render'

const ACTIVE_EVENT: BingoEvent = {
  id: 'active-1',
  name: 'Thunder Summer',
  description: null,
  start_at: '2026-08-30T12:00:00Z',
  end_at: '2026-09-06T12:00:00Z',
  status: 'active',
  created_at: '2026-08-20T12:00:00Z',
  updated_at: '2026-08-30T12:00:00Z',
}

describe('Events feature', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.mocked(fetchEvents).mockResolvedValue([])
  })

  it('renders the empty management state and public event form', async () => {
    renderApp(<EventsPage management />, '/admin/events')

    expect(await screen.findByText('No events found.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create event' })).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('link', { name: 'Events' })
        .some((link) => link.getAttribute('aria-current') === 'page'),
    ).toBe(true)
  })

  it('creates an event using timezone-safe instants', async () => {
    const user = userEvent.setup()
    vi.mocked(createEvent).mockResolvedValue({ ...ACTIVE_EVENT, status: 'draft' })
    renderApp(<EventsPage management />, '/admin/events')

    await user.click(await screen.findByRole('button', { name: 'Create event' }))
    await user.type(screen.getByLabelText('Name'), 'Autumn Bingo')
    await user.click(screen.getByRole('button', { name: '+1 day' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createEvent).toHaveBeenCalledOnce())
    const payload = vi.mocked(createEvent).mock.calls[0][0]
    expect(payload.start_at).toMatch(/Z$/)
    expect(dayjs(payload.end_at).diff(dayjs(payload.start_at), 'day', true)).toBe(1)
    expect(await screen.findByText('Event created.')).toBeInTheDocument()
  })

  it('shows an invalid schedule and applies a duration preset', async () => {
    const user = userEvent.setup()
    const start = dayjs('2026-09-08T12:00:00')
    const onEndChange = vi.fn()

    renderApp(
      <EventScheduleFields
        start={start}
        end={start.subtract(1, 'hour')}
        onStartChange={vi.fn()}
        onEndChange={onEndChange}
      />,
    )

    expect(screen.getByText('End must be later than start.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+7 days' }))
    expect(onEndChange).toHaveBeenCalledWith(start.add(7, 'day'))
  })

  it('shows the active event automatically without a selector or stored preference', async () => {
    localStorage.setItem(
      'osrs-bingo-current-event',
      JSON.stringify({ state: { selectedEventId: 'old-event' } }),
    )
    vi.mocked(fetchEvents).mockResolvedValue([ACTIVE_EVENT])
    renderApp(<ActiveEventIndicator />)
    expect(await screen.findByText('Thunder Summer · Active')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    localStorage.removeItem('osrs-bingo-current-event')
  })

  it('shows an explicit empty state without an active event', async () => {
    renderApp(<ActiveEventIndicator />)
    expect(await screen.findByText('No active event')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('keeps the activation dialog open and shows the error inside it', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchEvents).mockResolvedValue([{ ...ACTIVE_EVENT, status: 'draft' }])
    vi.mocked(activateEvent).mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        data: { detail: 'A complete valid 36-card board is required' },
      } as never),
    )
    renderApp(<EventsPage management />, '/admin/events')

    await user.click(await screen.findByRole('button', { name: 'Activate event' }))
    const dialog = screen.getByRole('dialog', { name: 'Activate event?' })
    await user.click(within(dialog).getByRole('button', { name: 'Activate' }))

    expect(
      await within(dialog).findByText(
        'Complete and save all 36 board positions before activating the event.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Complete and save all 36 board positions/)).toHaveLength(1)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/Complete and save all 36 board positions/)).not.toBeInTheDocument()
  })
})
