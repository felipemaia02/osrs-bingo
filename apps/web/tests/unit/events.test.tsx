import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import dayjs from 'dayjs'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import {
  activateEvent,
  addRulesAddendum,
  createEvent,
  setLateJoin,
  fetchEvents,
  updateEvent,
} from '../../src/features/events/api/eventsApi'
import { EventScheduleFields } from '../../src/features/events/components/EventScheduleFields'
import { AdminEventsPage } from '../../src/features/events/pages/AdminEventsPage'
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
    renderApp(<AdminEventsPage />, '/admin/events')

    expect(await screen.findByText('No events found.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New event' })).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('link', { name: 'Events' })
        .some((link) => link.getAttribute('aria-current') === 'page'),
    ).toBe(true)
  })

  it('adds a dated clarification to the rules of the active event (036)', async () => {
    const live: BingoEvent = { ...ACTIVE_EVENT, rules_text: 'Only drops during the event count.' }
    vi.mocked(fetchEvents).mockResolvedValue([live])
    vi.mocked(addRulesAddendum).mockResolvedValue({
      ...live,
      rules_addenda: [{ text: 'Pets count once.', added_at: '2026-09-01T12:00:00Z' }],
    })
    const user = userEvent.setup()
    renderApp(<AdminEventsPage />, '/admin/events')

    await user.click((await screen.findAllByRole('button', { name: 'Rules · Thunder Summer' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Rules · Thunder Summer' })
    expect(within(dialog).getByText('Only drops during the event count.')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Rules of the bingo')).toBeNull()
    await user.type(within(dialog).getByLabelText('Add a clarification'), 'Pets count once.')
    await user.click(within(dialog).getByRole('button', { name: 'Add clarification' }))

    await waitFor(() => expect(addRulesAddendum).toHaveBeenCalledOnce())
    expect(vi.mocked(addRulesAddendum).mock.calls[0][0]).toEqual({
      eventId: live.id,
      text: 'Pets count once.',
    })

    expect(await screen.findByText('Clarification added to the rules.')).toBeInTheDocument()
  })

  it('switches late join on for the active event (037)', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([ACTIVE_EVENT])
    vi.mocked(setLateJoin).mockResolvedValue({ ...ACTIVE_EVENT, late_join: true })
    const user = userEvent.setup()
    renderApp(<AdminEventsPage />, '/admin/events')

    const toggle = (
      await screen.findAllByRole('button', { name: 'Late join: off · Thunder Summer' })
    )[0]
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)

    await waitFor(() => expect(setLateJoin).toHaveBeenCalledOnce())
    expect(vi.mocked(setLateJoin).mock.calls[0][0]).toEqual({
      eventId: ACTIVE_EVENT.id,
      enabled: true,
    })
    expect(await screen.findByText(/Late join is on for Thunder Summer/)).toBeInTheDocument()
  })

  it('creates an event using timezone-safe instants', async () => {
    const user = userEvent.setup()
    vi.mocked(createEvent).mockResolvedValue({ ...ACTIVE_EVENT, status: 'draft' })
    renderApp(<AdminEventsPage />, '/admin/events')

    await user.click(await screen.findByRole('button', { name: 'New event' }))
    await user.type(screen.getByLabelText('Name'), 'Autumn Bingo')
    await user.type(screen.getByLabelText('Buy-in'), ' 5M gp ')
    await user.click(screen.getByRole('button', { name: '+1 day' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createEvent).toHaveBeenCalledOnce())
    const payload = vi.mocked(createEvent).mock.calls[0][0]
    expect(payload.start_at).toMatch(/Z$/)
    expect(payload.buy_in).toBe('5M gp')
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
    await user.click(screen.getByRole('button', { name: '+30 days' }))
    expect(onEndChange).toHaveBeenCalledWith(start.add(30, 'day'))
  })

  it('keeps the activation dialog open and shows the error inside it', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchEvents).mockResolvedValue([{ ...ACTIVE_EVENT, status: 'draft' }])
    vi.mocked(activateEvent).mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        data: { detail: 'A complete valid board is required' },
      } as never),
    )
    renderApp(<AdminEventsPage />, '/admin/events')

    await user.click(await screen.findByRole('button', { name: 'Activate event · Thunder Summer' }))
    const dialog = screen.getByRole('dialog', { name: 'Activate event?' })
    await user.click(within(dialog).getByRole('button', { name: 'Activate' }))

    expect(
      await within(dialog).findByText(
        'Complete and save every board position before activating the event.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Complete and save every board position/)).toHaveLength(1)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/Complete and save every board position/)).not.toBeInTheDocument()
  })

  describe('events v2', () => {
    const DRAFT: BingoEvent = {
      ...ACTIVE_EVENT,
      id: 'draft-1',
      name: 'Winter Bingo',
      description: 'Cold drops',
      status: 'draft',
    }
    const FINISHED: BingoEvent = {
      ...ACTIVE_EVENT,
      id: 'done-1',
      name: 'Spring Bingo',
      status: 'finished',
    }

    beforeEach(() => {
      vi.mocked(fetchEvents).mockResolvedValue([ACTIVE_EVENT, DRAFT, FINISHED])
    })

    it('shows tabs with counts, the active notice and actions by status', async () => {
      renderApp(<AdminEventsPage />, '/admin/events')

      const tabs = await screen.findByRole('tablist', { name: 'Event status' })
      expect(within(tabs).getByRole('tab', { name: 'All 3' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(within(tabs).getByRole('tab', { name: 'Draft 1' })).toBeInTheDocument()
      expect(
        screen.getByText(
          'Thunder Summer is active. Only one event can be active at a time: finish it before activating another.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Finish · Thunder Summer' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit · Winter Bingo' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Board · Winter Bingo' })).toHaveAttribute(
        'href',
        '/admin/boards?event=draft-1',
      )
      expect(
        screen.getByRole('button', { name: 'Activate event · Winter Bingo' }),
      ).toBeInTheDocument()
      expect(screen.getByText('Read-only')).toBeInTheDocument()
      expect(screen.getByText('Cold drops')).toBeInTheDocument()
      expect(screen.getAllByText(/· 7 days/)).toHaveLength(3)
    })

    it('filters by tab without a new request', async () => {
      const user = userEvent.setup()
      renderApp(<AdminEventsPage />, '/admin/events')
      await screen.findByRole('tab', { name: 'Draft 1' })
      const calls = vi.mocked(fetchEvents).mock.calls.length

      await user.click(screen.getByRole('tab', { name: 'Draft 1' }))

      const panel = screen.getByRole('tabpanel')
      expect(within(panel).getByText('Winter Bingo')).toBeInTheDocument()
      expect(within(panel).queryByText('Spring Bingo')).toBeNull()
      expect(vi.mocked(fetchEvents).mock.calls.length).toBe(calls)
    })

    it('edits a draft in the modal and keeps inputs when the API fails', async () => {
      const user = userEvent.setup()
      vi.mocked(updateEvent).mockRejectedValueOnce(
        new AxiosError('Conflict', '409', undefined, undefined, {
          status: 409,
          data: { detail: 'Only draft events can be edited' },
        } as never),
      )
      vi.mocked(updateEvent).mockResolvedValueOnce(DRAFT)
      renderApp(<AdminEventsPage />, '/admin/events')

      await user.click(await screen.findByRole('button', { name: 'Edit · Winter Bingo' }))
      const dialog = screen.getByRole('dialog', { name: 'Edit event' })
      await user.clear(within(dialog).getByLabelText('Name'))
      await user.type(within(dialog).getByLabelText('Name'), 'Winter Bingo II')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))

      expect(
        await within(dialog).findByText('Only draft events can be edited.'),
      ).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Name')).toHaveValue('Winter Bingo II')

      await user.click(within(dialog).getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.getByText('Event updated.')).toBeInTheDocument()
      expect(vi.mocked(updateEvent).mock.calls[1][0]).toBe('draft-1')
      expect(vi.mocked(updateEvent).mock.calls[1][1].name).toBe('Winter Bingo II')
    })
  })
})
