import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { fetchSession } from '../../src/features/auth/api/authApi'
import { fetchPublicBoard } from '../../src/features/boards/api/boardsApi'
import type { BoardCardSnapshot, EventBoard } from '../../src/features/boards/types'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import type { BingoEvent } from '../../src/features/events/types'
import {
  acceptSubmission,
  createSubmission,
  fetchOwnSubmissions,
  fetchReviewQueue,
  fetchTileHistory,
  rejectSubmission,
  revertSubmission,
} from '../../src/features/submissions/api/submissionsApi'
import { MySubmissionsPage } from '../../src/features/submissions/pages/MySubmissionsPage'
import { ReviewPage } from '../../src/features/submissions/pages/ReviewPage'
import type { ReviewItem, Submission } from '../../src/features/submissions/types'
import * as teamsApi from '../../src/features/teams/api/teamsApi'
import { renderApp } from '../render'

const EVENT: BingoEvent = {
  id: 'event-1',
  name: 'Autumn Bingo 2026',
  description: null,
  status: 'active',
  start_at: '2026-10-01T12:00:00Z',
  end_at: '2026-12-01T12:00:00Z',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}
const PLAYER_USER = { id: 'user-1', discord_id: '1', username: 'Holy Hal', is_admin: false }

function snapshot(name: string, requires: boolean): BoardCardSnapshot {
  return {
    card_id: `card-${name}`,
    slug: name.toLowerCase(),
    card_revision: 2,
    name,
    description: null,
    kind: 'boss',
    difficulty: 'Mid',
    tile_score: 10,
    completion_requirement: 8,
    drops: [
      {
        key: `${name}-unique`,
        name: `${name} Unique`,
        progress_weight: 2,
        aliases: [],
        verification_note: null,
        counting_restriction: null,
      },
    ],
    wiki_image: null,
    fallback_image_accepted: true,
    rule_note: null,
    provenance: {
      source: 'admin',
      source_ref: null,
      source_cells: [],
      derived_from_revision: null,
    },
    requires_preverification: requires,
  }
}

const BOARD: EventBoard = {
  event_id: EVENT.id,
  status: 'published',
  revision: 1,
  size: 3,
  complete: true,
  created_at: EVENT.created_at,
  updated_at: EVENT.updated_at,
  published_at: EVENT.created_at,
  positions: [
    { position: 1, row: 1, column: 1, card: snapshot('Vorkath', false) },
    {
      position: 2,
      row: 1,
      column: 2,
      card: { ...snapshot('Theatre', true), rule_note: 'Screenshot your ToB KC before the event.' },
    },
  ],
}

function submission(overrides: Partial<Submission>): Submission {
  return {
    id: 'sub-1',
    event_id: EVENT.id,
    kind: 'drop',
    status: 'pending',
    position: 1,
    row: 1,
    column: 1,
    card_id: 'card-Vorkath',
    card_revision: 2,
    card_name: 'Vorkath',
    drop_key: 'Vorkath-unique',
    drop_name: 'Vorkath Unique',
    progress_weight: 2,
    quantity: 1,
    note: null,
    submitted_at: '2026-10-22T18:00:00Z',
    reviewed_at: null,
    reviewer_name: null,
    rejection_reason: null,
    rejection_note: null,
    ...overrides,
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchSession).mockResolvedValue(PLAYER_USER)
  vi.mocked(fetchEvents).mockResolvedValue([EVENT])
  vi.mocked(fetchPublicBoard).mockResolvedValue(BOARD)
  vi.mocked(fetchOwnSubmissions).mockResolvedValue({
    items: [],
    counts: { all: 0, pending: 0, accepted: 0, rejected: 0 },
  })
  vi.mocked(teamsApi.fetchOwnRegistration).mockResolvedValue({
    id: 'player-1',
    event_id: EVENT.id,
    display_name: 'Holy Hal',
    team_id: 'team-1',
    status: 'approved',
  })
  vi.mocked(teamsApi.fetchTeams).mockResolvedValue([
    { id: 'team-1', event_id: EVENT.id, name: 'Saradomin', color: null, member_count: 6 },
  ])
})

describe('My submissions', () => {
  it('lists own submissions with status tabs, progress and rejection reasons', async () => {
    vi.mocked(fetchOwnSubmissions).mockResolvedValue({
      items: [
        submission({ id: 'a', status: 'accepted', reviewer_name: 'felps_' }),
        submission({
          id: 'b',
          status: 'rejected',
          rejection_reason: 'unreadable_screenshot',
          reviewer_name: 'felps_',
        }),
        submission({
          id: 'c',
          kind: 'preverification',
          position: 2,
          card_name: 'Theatre',
          drop_key: null,
          drop_name: null,
          progress_weight: null,
        }),
      ],
      counts: { all: 3, pending: 1, accepted: 1, rejected: 1 },
    })
    const user = userEvent.setup()
    renderApp(<MySubmissionsPage />, '/submissions')

    expect(await screen.findByText('Autumn Bingo 2026 · Saradomin')).toBeInTheDocument()
    expect(await screen.findByText('+2 progress on Vorkath')).toBeInTheDocument()
    expect(screen.getByText('unreadable screenshot')).toBeInTheDocument()
    expect(screen.getByText('Pre-verification · Theatre')).toBeInTheDocument()
    expect(
      screen.getByText("Until it's accepted, drops for this card don't count yet."),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rejected 1' }))
    expect(screen.queryByText('+2 progress on Vorkath')).toBeNull()
    expect(screen.getByText('unreadable screenshot')).toBeInTheDocument()
  })

  it('asks for the pre-verification first, then sends drops of that card', async () => {
    vi.mocked(createSubmission).mockResolvedValue(submission({}))
    const user = userEvent.setup()
    renderApp(<MySubmissionsPage />, '/submissions')

    await user.click(await screen.findByRole('button', { name: 'Submit with screenshot' }))
    const dialog = screen.getByRole('dialog', { name: 'Submit with screenshot' })
    await user.click(within(dialog).getByRole('radio', { name: /Theatre/ }))
    expect(within(dialog).getByText('Theatre needs a pre-verification first')).toBeInTheDocument()
    expect(within(dialog).getByText('Screenshot your ToB KC before the event.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('radio', { name: /Theatre Unique/ })).toBeNull()

    await user.click(within(dialog).getByRole('button', { name: 'Send pre-verification' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Attach a screenshot.')

    const file = new File([new Uint8Array([137, 80, 78, 71])], 'kc.png', { type: 'image/png' })
    await user.upload(within(dialog).getByLabelText('Choose a screenshot'), file)
    await user.click(within(dialog).getByRole('button', { name: 'Send pre-verification' }))

    await waitFor(() => expect(createSubmission).toHaveBeenCalledOnce())
    expect(vi.mocked(createSubmission).mock.calls[0][0]).toEqual({
      eventId: EVENT.id,
      payload: { kind: 'preverification', position: 2, dropKey: null, note: '', screenshot: file },
    })
    expect(
      await screen.findByText("Pre-verification sent. You can now send this card's drops."),
    ).toBeInTheDocument()
  })

  it('sends one item of a card with its screenshot', async () => {
    vi.mocked(createSubmission).mockResolvedValue(submission({}))
    const user = userEvent.setup()
    renderApp(<MySubmissionsPage />, '/submissions')

    await user.click(await screen.findByRole('button', { name: 'Submit with screenshot' }))
    const dialog = screen.getByRole('dialog', { name: 'Submit with screenshot' })
    await user.click(within(dialog).getByRole('radio', { name: /Vorkath/ }))
    await user.click(within(dialog).getByRole('radio', { name: /Vorkath Unique/ }))
    const file = new File([new Uint8Array([255, 216, 255])], 'drop.jpg', { type: 'image/jpeg' })
    await user.upload(within(dialog).getByLabelText('Choose a screenshot'), file)
    await user.click(within(dialog).getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(createSubmission).toHaveBeenCalledOnce())
    expect(vi.mocked(createSubmission).mock.calls[0][0].payload).toMatchObject({
      kind: 'drop',
      position: 1,
      dropKey: 'Vorkath-unique',
    })
  })

  it('tells the player when an accepted submission was reverted', async () => {
    vi.mocked(fetchOwnSubmissions).mockResolvedValue({
      items: [
        submission({
          status: 'rejected',
          rejection_reason: 'duplicate',
          reverted_at: '2026-10-23T10:00:00Z',
        }),
      ],
      counts: { all: 1, pending: 0, accepted: 0, rejected: 1 },
    })
    renderApp(<MySubmissionsPage />, '/submissions')

    expect(
      await screen.findByText('Reverted by an admin after being accepted.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/duplicate \(already sent\)/)).toBeInTheDocument()
  })

  it('explains why a player without a team cannot submit', async () => {
    vi.mocked(teamsApi.fetchOwnRegistration).mockResolvedValue({
      id: 'player-1',
      event_id: EVENT.id,
      display_name: 'Holy Hal',
      team_id: null,
      status: 'approved',
    })
    renderApp(<MySubmissionsPage />, '/submissions')

    expect(await screen.findByText(/once an administrator puts you on a team/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit with screenshot' })).toBeNull()
  })
})

describe('Drop review', () => {
  function reviewItem(overrides: Partial<ReviewItem>): ReviewItem {
    return {
      ...submission({}),
      player_id: 'player-1',
      player_name: 'Holy Hal',
      team_id: 'team-1',
      team_name: 'Saradomin',
      team_color: '#2F5592',
      requires_preverification: false,
      preverification_status: null,
      within_event: true,
      ...overrides,
    }
  }
  const GATED_DROP = reviewItem({
    id: 'drop-1',
    position: 2,
    card_name: 'Theatre',
    drop_name: 'Theatre Unique',
    requires_preverification: true,
    preverification_status: 'pending',
  })
  const PREVERIFICATION = reviewItem({
    id: 'pre-1',
    kind: 'preverification',
    position: 2,
    card_name: 'Theatre',
    drop_key: null,
    drop_name: null,
    progress_weight: null,
    requires_preverification: true,
  })

  beforeEach(() => {
    vi.mocked(fetchSession).mockResolvedValue({ ...PLAYER_USER, is_admin: true })
    vi.mocked(fetchReviewQueue).mockResolvedValue({
      items: [GATED_DROP, PREVERIFICATION],
      total: 2,
      offset: 0,
      limit: 50,
      counts: { pending: 2, pending_preverification: 1, pending_drop: 1 },
    })
  })

  it('blocks accepting a drop until its pre-verification is accepted', async () => {
    const user = userEvent.setup()
    renderApp(<ReviewPage />, '/admin/review')

    const detail = await screen.findByRole('region', { name: 'Selected submission' })
    expect(within(detail).getByText('Theatre Unique — Holy Hal')).toBeInTheDocument()
    expect(within(detail).getByText(/Waiting for pre-verification/)).toBeInTheDocument()
    expect(within(detail).getByRole('button', { name: /Accept/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Pre-verification 1' })).toBeInTheDocument()

    await user.keyboard('j')
    const next = screen.getByRole('region', { name: 'Selected submission' })
    expect(within(next).getByText('Initial screenshot — Holy Hal')).toBeInTheDocument()
    vi.mocked(acceptSubmission).mockResolvedValue(submission({ status: 'accepted' }))
    await user.keyboard('a')
    await waitFor(() => expect(acceptSubmission).toHaveBeenCalledOnce())
    expect(vi.mocked(acceptSubmission).mock.calls[0][0]).toBe('pre-1')
    expect(await screen.findByText('Submission accepted.')).toBeInTheDocument()
  })

  it('marks DropTracker drops and handles drops without an image', async () => {
    vi.mocked(fetchReviewQueue).mockResolvedValue({
      items: [
        reviewItem({
          id: 'auto-1',
          source: 'droptracker',
          has_screenshot: false,
          note: 'Automatic · Alchemical Hydra · x1 · 2026-10-24 20:38 UTC',
        }),
      ],
      total: 1,
      offset: 0,
      limit: 50,
      counts: { pending: 1, pending_preverification: 0, pending_drop: 1 },
    })
    renderApp(<ReviewPage />, '/admin/review')

    const detail = await screen.findByRole('region', { name: 'Selected submission' })
    expect(within(detail).getByText('DropTracker')).toBeInTheDocument()
    expect(within(detail).getByText('No screenshot from DropTracker')).toBeInTheDocument()
    expect(within(detail).getByRole('button', { name: /Accept/ })).toBeEnabled()
    expect(screen.getByRole('list', { name: 'Pending submissions' })).toHaveTextContent(
      'DropTracker',
    )
  })

  it('blocks accepting an item no longer on a card fixed during the event (036)', async () => {
    vi.mocked(fetchReviewQueue).mockResolvedValue({
      items: [reviewItem({ id: 'gone-1', drop_removed: true })],
      total: 1,
      offset: 0,
      limit: 50,
      counts: { pending: 1, pending_preverification: 0, pending_drop: 1 },
    })
    renderApp(<ReviewPage />, '/admin/review')

    const detail = await screen.findByRole('region', { name: 'Selected submission' })
    expect(within(detail).getByText(/no longer on this card/)).toBeInTheDocument()
    expect(within(detail).getByRole('button', { name: /Accept/ })).toBeDisabled()
  })

  it("doesn't let admins review their own team", async () => {
    vi.mocked(fetchReviewQueue).mockResolvedValue({
      items: [reviewItem({ id: 'own-1', own_team: true })],
      total: 1,
      offset: 0,
      limit: 50,
      counts: { pending: 1, pending_preverification: 0, pending_drop: 1 },
    })
    const user = userEvent.setup()
    renderApp(<ReviewPage />, '/admin/review')

    const detail = await screen.findByRole('region', { name: 'Selected submission' })
    expect(
      within(detail).getByText('You play on this team — another admin reviews it.'),
    ).toBeInTheDocument()
    expect(within(detail).queryByRole('button', { name: /Accept/ })).toBeNull()
    expect(within(detail).queryByRole('button', { name: /Reject/ })).toBeNull()
    await user.keyboard('a')
    expect(acceptSubmission).not.toHaveBeenCalled()
  })

  it('rejects with a reason; Other needs a description', async () => {
    vi.mocked(rejectSubmission).mockResolvedValue(submission({ status: 'rejected' }))
    const user = userEvent.setup()
    renderApp(<ReviewPage />, '/admin/review')

    const detail = await screen.findByRole('region', { name: 'Selected submission' })
    const reject = within(detail).getByRole('button', { name: /Reject/ })
    expect(reject).toBeDisabled()
    await user.selectOptions(within(detail).getByLabelText(/Rejection reason/), 'other')
    expect(reject).toBeDisabled()
    await user.type(within(detail).getByLabelText('Describe the reason'), 'Wrong boss')
    await user.click(reject)

    await waitFor(() => expect(rejectSubmission).toHaveBeenCalledOnce())
    expect(vi.mocked(rejectSubmission).mock.calls[0][0]).toEqual({
      submissionId: 'drop-1',
      payload: { reason: 'other', note: 'Wrong boss' },
    })
  })

  it('flags a possible duplicate and shows what the team already has on the tile', async () => {
    vi.mocked(fetchReviewQueue).mockResolvedValue({
      items: [reviewItem({ id: 'dup-1', possible_duplicates: ['auto-9'] })],
      total: 1,
      offset: 0,
      limit: 50,
      counts: { pending: 1, pending_preverification: 0, pending_drop: 1 },
    })
    vi.mocked(fetchTileHistory).mockResolvedValue({
      team_id: 'team-1',
      team_name: 'Saradomin',
      card_name: 'Vorkath',
      progress: 4,
      requirement: 8,
      complete: false,
      items: [
        {
          id: 'auto-9',
          player_name: 'Holy Hal',
          drop_name: 'Vorkath Unique',
          progress_weight: 2,
          status: 'accepted',
          source: 'droptracker',
          submitted_at: '2026-10-22T17:58:00Z',
          has_screenshot: true,
          same_item: true,
          possible_duplicate: true,
        },
      ],
    })
    renderApp(<ReviewPage />, '/admin/review')

    const detail = await screen.findByRole('region', { name: 'Selected submission' })
    expect(within(detail).getByRole('note')).toHaveTextContent('Possible duplicate')
    expect(screen.getByRole('list', { name: 'Pending submissions' })).toHaveTextContent(
      'Possible duplicate',
    )
    const history = await within(detail).findByRole('region', {
      name: 'Already on this tile for Saradomin',
    })
    expect(history).toHaveTextContent('Progress 4 / 8')
    expect(history).toHaveTextContent('Vorkath Unique')
    expect(history).toHaveTextContent('DropTracker')
    expect(fetchTileHistory).toHaveBeenCalledWith('dup-1')
  })

  it('lists accepted submissions and reverts one with a reason', async () => {
    vi.mocked(fetchReviewQueue).mockImplementation(async (_event, _kind, _limit, status) =>
      status === 'accepted'
        ? {
            items: [reviewItem({ id: 'acc-1', status: 'accepted', reviewer_name: 'felps_' })],
            total: 1,
            offset: 0,
            limit: 50,
            counts: { pending: 0, pending_preverification: 0, pending_drop: 0 },
          }
        : {
            items: [],
            total: 0,
            offset: 0,
            limit: 50,
            counts: { pending: 0, pending_preverification: 0, pending_drop: 0 },
          },
    )
    vi.mocked(revertSubmission).mockResolvedValue(submission({ status: 'rejected' }))
    const user = userEvent.setup()
    renderApp(<ReviewPage />, '/admin/review')

    await user.click(await screen.findByRole('button', { name: 'Accepted' }))
    const detail = await screen.findByRole('region', { name: 'Selected submission' })
    expect(within(detail).getByText(/Accepted by felps_/)).toBeInTheDocument()
    expect(within(detail).queryByRole('button', { name: /^Accept/ })).toBeNull()
    const revert = within(detail).getByRole('button', { name: 'Revert' })
    expect(revert).toBeDisabled()
    await user.selectOptions(within(detail).getByLabelText(/Reason for reverting/), 'duplicate')
    await user.click(revert)

    await waitFor(() => expect(revertSubmission).toHaveBeenCalledOnce())
    expect(vi.mocked(revertSubmission).mock.calls[0][0]).toEqual({
      submissionId: 'acc-1',
      payload: { reason: 'duplicate', note: null },
    })
    expect(
      await screen.findByText('Submission reverted. The player sees the reason.'),
    ).toBeInTheDocument()
  })
})
