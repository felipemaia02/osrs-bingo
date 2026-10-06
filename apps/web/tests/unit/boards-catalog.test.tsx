import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { AppRouter } from '../../src/app/router'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import {
  fetchCards,
  importWorkbookCatalog,
} from '../../src/features/cards/api/cardsApi'
import { fetchAdminBoard, saveBoard } from '../../src/features/boards/api/boardsApi'
import type { CardSummary } from '../../src/features/cards/types'
import type { BingoEvent } from '../../src/features/events/types'
import { renderApp } from '../render'

const EVENT: BingoEvent = {
  id: '66d000000000000000000001',
  name: 'Summer Bingo',
  description: null,
  status: 'draft',
  start_at: '2026-10-03T12:00:00Z',
  end_at: '2026-10-10T12:00:00Z',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

const CARD: CardSummary = {
  id: '66d000000000000000000010',
  slug: 'vorkath',
  status: 'active',
  current_revision: 1,
  created_at: EVENT.created_at,
  updated_at: EVENT.updated_at,
  revision: {
    revision: 1,
    name: 'Vorkath',
    description: null,
    kind: 'boss',
    difficulty: 'High',
    tile_score: 13,
    completion_requirement: 8,
    drops: [
      {
        key: 'skeletal-visage',
        name: 'Skeletal Visage',
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
    change_reason: 'Initial',
    created_by: 'admin',
    created_at: EVENT.created_at,
  },
}

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
  vi.mocked(fetchEvents).mockResolvedValue([EVENT])
  vi.mocked(fetchCards).mockResolvedValue([CARD])
  vi.mocked(fetchAdminBoard).mockResolvedValue(null)
})

it('imports the approved workbook from the protected catalog page', async () => {
  vi.mocked(importWorkbookCatalog).mockResolvedValue({
    source_sha256: 'hash',
    expected_cards: 36,
    expected_drops: 213,
    source_bonus_entries: 32,
    resolved_bonus_entries: 33,
    imported_cards: 36,
    existing_cards: 0,
    conflicting_slugs: [],
    usable: true,
  })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')

  await user.click(await screen.findByRole('button', { name: 'Import approved workbook' }))

  expect(importWorkbookCatalog).toHaveBeenCalledOnce()
  expect(await screen.findByText(/36 imported and 0 already present/)).toBeInTheDocument()
})

it('saves selected exact card revisions for a draft event board', async () => {
  vi.mocked(saveBoard).mockResolvedValue({
    event_id: EVENT.id,
    status: 'draft',
    revision: 1,
    complete: false,
    positions: [],
    created_at: EVENT.created_at,
    updated_at: EVENT.updated_at,
    published_at: null,
  })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/boards')

  await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
  await user.selectOptions(await screen.findByLabelText('Event'), EVENT.id)
  await user.selectOptions(await screen.findByLabelText('Position 1'), `${CARD.id}:1`)
  await user.click(screen.getByRole('button', { name: 'Save board' }))

  expect(vi.mocked(saveBoard).mock.calls[0][0]).toEqual({
    eventId: EVENT.id,
    payload: {
      expected_revision: 0,
      positions: [{ position: 1, card_id: CARD.id, card_revision: 1 }],
    },
  })
})
