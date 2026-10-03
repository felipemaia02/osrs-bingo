import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { createEvent, fetchEvents } from '../../src/features/events/api/eventsApi'
import { EventSelector } from '../../src/features/events/components/EventSelector'
import { EventScheduleFields } from '../../src/features/events/components/EventScheduleFields'
import { EventsPage } from '../../src/features/events/pages/EventsPage'
import { useEventSelectionStore } from '../../src/features/events/store/eventSelectionStore'
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
    useEventSelectionStore.getState().clearSelection()
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

  it('persists an explicitly selected active event', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchEvents).mockResolvedValue([ACTIVE_EVENT])
    renderApp(<EventSelector />)

    await screen.findByRole('option', { name: 'Thunder Summer · Active' })
    await user.selectOptions(screen.getByLabelText('Current event'), ACTIVE_EVENT.id)

    expect(useEventSelectionStore.getState().selectedEventId).toBe(ACTIVE_EVENT.id)
    expect(localStorage.getItem('osrs-bingo-current-event')).toContain(ACTIVE_EVENT.id)
  })

  it('clears a stored selection that is no longer active', async () => {
    useEventSelectionStore.getState().selectEvent('finished-event')
    renderApp(<EventSelector />)

    await waitFor(() => expect(useEventSelectionStore.getState().selectedEventId).toBeNull())
  })
})
