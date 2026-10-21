import { fireEvent, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../src/lib/i18n'
import { AppRouter } from '../../src/app/router'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import {
  createCardRevision,
  fetchCards,
  importWorkbookCatalog,
  resolveWikiImage,
  retireCard,
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

  expect(importWorkbookCatalog).not.toHaveBeenCalled()
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Import approved workbook' }),
  )
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
  await user.click(await screen.findByRole('button', { name: 'Add Vorkath' }))
  await user.click(screen.getByRole('button', { name: 'Save board' }))

  expect(vi.mocked(saveBoard).mock.calls[0][0]).toEqual({
    eventId: EVENT.id,
    payload: {
      expected_revision: 0,
      positions: [{ position: 1, card_id: CARD.id, card_revision: 1 }],
    },
  })
})

it('loads the visual catalog before event selection without assigning cards', async () => {
  renderApp(<AppRouter />, '/admin/boards')
  expect(await screen.findByRole('button', { name: 'Add Vorkath' })).toBeDisabled()
  expect(fetchCards).toHaveBeenCalled()
  expect(saveBoard).not.toHaveBeenCalled()
})

it('assigns, prevents duplicates and removes cards without a swap control', async () => {
  vi.mocked(fetchCards).mockResolvedValue([
    CARD,
    { ...CARD, id: 'other', revision: { ...CARD.revision, name: 'Zulrah' } },
  ])
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/boards')
  await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  const card = await screen.findByRole('button', { name: 'Add Vorkath' })
  await user.click(card)
  expect(card).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Position 1' })).toHaveTextContent('Vorkath')
  await user.click(screen.getByRole('button', { name: 'Add Zulrah' }))
  await user.click(screen.getByRole('button', { name: 'Position 1' }))
  expect(screen.queryByRole('button', { name: 'Move / swap' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Remove card' }))
  expect(card).toBeEnabled()
})

it('keeps the pinned snapshot visible when the catalog has a newer revision', async () => {
  vi.mocked(fetchCards).mockResolvedValue([
    {
      ...CARD,
      current_revision: 2,
      revision: { ...CARD.revision, revision: 2, name: 'New Vorkath' },
    },
  ])
  vi.mocked(fetchAdminBoard).mockResolvedValue({
    event_id: EVENT.id,
    status: 'draft',
    revision: 1,
    complete: false,
    positions: [
      {
        position: 1,
        row: 0,
        column: 0,
        card: { ...CARD.revision, card_id: CARD.id, slug: CARD.slug, card_revision: 1 },
      },
    ],
    created_at: EVENT.created_at,
    updated_at: EVENT.updated_at,
    published_at: null,
  })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/boards')
  await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  const position = await screen.findByRole('button', { name: 'Position 1' })
  expect(position).toHaveTextContent('Vorkath')
  expect(position).not.toHaveTextContent('New Vorkath')
  expect(screen.getByRole('button', { name: 'Add New Vorkath' })).toBeDisabled()

  const rules = screen.getByRole('region', { name: 'Rules for position 1' })
  expect(within(rules).getByText('13 points when progress reaches 8')).toBeInTheDocument()
  expect(within(rules).getByText('+2 progress')).toBeInTheDocument()
})

it('keeps published events read-only', async () => {
  vi.mocked(fetchEvents).mockResolvedValue([{ ...EVENT, status: 'active' }])
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/boards')
  await screen.findByRole('option', { name: 'Summer Bingo · Active' })
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  expect(await screen.findByRole('button', { name: 'Add Vorkath' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Save board' })).not.toBeInTheDocument()
})

it('offers catalog setup when no cards exist', async () => {
  vi.mocked(fetchCards).mockResolvedValue([])
  renderApp(<AppRouter />, '/admin/boards')
  expect(await screen.findByRole('link', { name: 'Open card catalog' })).toHaveAttribute(
    'href',
    '/admin/cards',
  )
})

it('shows one drop area without empty position placeholders and accepts dragged catalog cards', async () => {
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/boards')
  await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  const dropZone = await screen.findByRole('region', { name: 'Drag cards here' })
  expect(screen.queryByRole('button', { name: 'Position 1' })).not.toBeInTheDocument()
  const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
  fireEvent.dragStart(screen.getByRole('button', { name: 'Add Vorkath' }), { dataTransfer })
  fireEvent.dragOver(dropZone, { dataTransfer })
  fireEvent.drop(dropZone, { dataTransfer })
  expect(screen.getByRole('button', { name: 'Position 1' })).toHaveTextContent('Vorkath')
  expect(screen.queryByRole('button', { name: 'Position 2' })).not.toBeInTheDocument()
  expect(screen.queryByText('Empty position')).not.toBeInTheDocument()
  fireEvent.drop(dropZone, { dataTransfer })
  expect(screen.queryByRole('button', { name: 'Position 2' })).not.toBeInTheDocument()
})

it('swaps occupied positions by dragging without changing card revisions', async () => {
  vi.mocked(fetchCards).mockResolvedValue([
    CARD,
    { ...CARD, id: 'other', revision: { ...CARD.revision, name: 'Zulrah' } },
  ])
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/boards')
  await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  await user.click(await screen.findByRole('button', { name: 'Add Vorkath' }))
  await user.click(screen.getByRole('button', { name: 'Add Zulrah' }))
  const first = screen.getByRole('button', { name: 'Position 1' })
  const second = screen.getByRole('button', { name: 'Position 2' })
  const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
  fireEvent.dragStart(first, { dataTransfer })
  fireEvent.dragOver(second, { dataTransfer })
  fireEvent.drop(second, { dataTransfer })
  expect(first).toHaveTextContent('Zulrah')
  expect(second).toHaveTextContent('Vorkath')
  expect(second).toHaveTextContent('v1')
})

it('adds the whole catalog up to capacity, preserving assigned cards despite search', async () => {
  const extras = Array.from({ length: 40 }, (_, index) => ({
    ...CARD,
    id: `extra-${index}`,
    revision: { ...CARD.revision, name: `Extra ${index}` },
  }))
  vi.mocked(fetchCards).mockResolvedValue([CARD, ...extras])
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/boards')
  expect(await screen.findByRole('button', { name: 'Add all' })).toBeDisabled()
  await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  await user.click(await screen.findByRole('button', { name: 'Add Vorkath' }))
  await user.type(screen.getByRole('searchbox'), 'not a card')
  await user.click(screen.getByRole('button', { name: 'Add all' }))
  expect(screen.getAllByRole('button', { name: /^Position \d+$/ })).toHaveLength(36)
  expect(screen.getByRole('button', { name: 'Position 1' })).toHaveTextContent('Vorkath')
  expect(screen.getByRole('button', { name: 'Position 2' })).toHaveTextContent('Extra 0')
  expect(screen.getByRole('button', { name: 'Position 36' })).toHaveTextContent('Extra 34')
  expect(screen.getByRole('button', { name: 'Add all' })).toBeDisabled()
  expect(saveBoard).not.toHaveBeenCalled()
})

it('disables bulk addition when every catalog card has already been added', async () => {
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/boards')
  await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
  await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
  await user.click(screen.getByRole('button', { name: 'Add all' }))
  expect(screen.getByRole('button', { name: 'Position 1' })).toHaveTextContent('Vorkath')
  expect(screen.getByRole('button', { name: 'Add all' })).toBeDisabled()
})

it('opens creation in a modal and restores focus on Escape without saving', async () => {
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')
  const trigger = await screen.findByRole('button', { name: 'Create card' })
  await user.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Create catalog card' })
  expect(within(dialog).getByLabelText('Stable key')).toBeInTheDocument()
  expect(within(dialog).getByLabelText('Name')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('keeps revision errors inside the modal and closes after successful retry', async () => {
  vi.mocked(createCardRevision)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      ...CARD,
      revisions: [CARD.revision],
      retired_by: null,
      retired_at: null,
      retirement_reason: null,
    })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')
  await user.click(await screen.findByRole('button', { name: 'Edit Vorkath' }))
  const dialog = screen.getByRole('dialog', { name: 'Publish a new card revision' })
  expect(within(dialog).getByLabelText('Name')).toHaveValue('Vorkath')
  await user.type(within(dialog).getByLabelText('Reason for this revision'), 'Update description')
  await user.click(within(dialog).getByRole('button', { name: 'Save' }))
  expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(await screen.findByText('New card revision published.')).toBeInTheDocument()
  expect(vi.mocked(createCardRevision).mock.calls.slice(-1)[0]?.[0]).toEqual(
    expect.objectContaining({ cardId: CARD.id, expectedRevision: 1 }),
  )
})

it('shows drop weights as progress and the tile score only on completion', async () => {
  vi.mocked(fetchCards).mockResolvedValue([
    {
      ...CARD,
      slug: 'grotesque-guardians',
      revision: {
        ...CARD.revision,
        name: 'Grotesque Guardians',
        difficulty: 'Mid',
        tile_score: 10,
        completion_requirement: 8,
        drops: [
          {
            ...CARD.revision.drops[0],
            key: 'granite-maul',
            name: 'Granite Maul',
            progress_weight: 1,
          },
        ],
      },
    },
  ])
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')

  await user.click(await screen.findByText('Rules and accepted drops'))

  expect(screen.getByText('10 points when progress reaches 8')).toBeInTheDocument()
  const drop = screen.getByText('Granite Maul').closest('li')!
  expect(within(drop).getByText('+1 progress')).toBeInTheDocument()
  expect(within(drop).queryByText(/points/)).not.toBeInTheDocument()
})

it('keeps drop keys and verification metadata when publishing an edited revision', async () => {
  const noted = {
    ...CARD.revision.drops[0],
    key: 'visage-workbook-key',
    aliases: ['Visage'],
    verification_note: 'Screenshot required',
    counting_restriction: 'Once per team',
  }
  vi.mocked(fetchCards).mockResolvedValue([
    { ...CARD, revision: { ...CARD.revision, drops: [noted] } },
  ])
  vi.mocked(createCardRevision).mockResolvedValue({
    ...CARD,
    revisions: [CARD.revision],
    retired_by: null,
    retired_at: null,
    retirement_reason: null,
  })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')

  await user.click(await screen.findByRole('button', { name: 'Edit Vorkath' }))
  const dialog = screen.getByRole('dialog', { name: 'Publish a new card revision' })
  const drops = within(dialog).getByLabelText('Accepted drops (one per line)')
  await user.clear(drops)
  await user.type(drops, 'Skeletal Visage | 3{enter}Dragonbone necklace | 1')
  await user.type(within(dialog).getByLabelText('Reason for this revision'), 'Rebalance')
  await user.click(within(dialog).getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(createCardRevision).toHaveBeenCalledOnce())
  const payload = vi.mocked(createCardRevision).mock.calls[0][0].payload
  expect(payload.drops).toEqual([
    { ...noted, progress_weight: 3 },
    {
      key: 'dragonbone-necklace',
      name: 'Dragonbone necklace',
      progress_weight: 1,
      aliases: [],
      verification_note: null,
      counting_restriction: null,
    },
  ])
})

it('resolves a Wiki image in the editor and sends it with the revision', async () => {
  const image = {
    article_title: 'Vorkath',
    article_url: 'https://oldschool.runescape.wiki/w/Vorkath',
    file_name: 'Vorkath.png',
    file_page_url: 'https://oldschool.runescape.wiki/w/File:Vorkath.png',
    image_url: 'https://oldschool.runescape.wiki/images/Vorkath.png',
    width: 512,
    height: 400,
    mime_type: 'image/png',
    attribution: 'Old School RuneScape Wiki',
    license_name: null,
    license_url: null,
    resolved_at: EVENT.created_at,
  }
  vi.mocked(resolveWikiImage).mockResolvedValue(image)
  vi.mocked(createCardRevision).mockResolvedValue({
    ...CARD,
    revisions: [CARD.revision],
    retired_by: null,
    retired_at: null,
    retirement_reason: null,
  })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')

  await user.click(await screen.findByRole('button', { name: 'Edit Vorkath' }))
  const dialog = screen.getByRole('dialog', { name: 'Publish a new card revision' })
  await user.click(within(dialog).getByRole('button', { name: 'Find image' }))
  expect(await within(dialog).findByText('Vorkath.png')).toBeInTheDocument()
  expect(vi.mocked(resolveWikiImage).mock.calls[0][0]).toBe('Vorkath')
  await user.type(within(dialog).getByLabelText('Reason for this revision'), 'Add image')
  await user.click(within(dialog).getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(createCardRevision).toHaveBeenCalledOnce())
  const payload = vi.mocked(createCardRevision).mock.calls[0][0].payload
  expect(payload.wiki_image).toEqual(image)
  expect(payload.fallback_image_accepted).toBe(false)
})

it('keeps the editor usable when the Wiki image cannot be resolved', async () => {
  vi.mocked(resolveWikiImage).mockRejectedValue(new Error('offline'))
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')

  await user.click(await screen.findByRole('button', { name: 'Edit Vorkath' }))
  const dialog = screen.getByRole('dialog', { name: 'Publish a new card revision' })
  await user.click(within(dialog).getByRole('button', { name: 'Find image' }))

  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'The Wiki image could not be resolved',
  )
  expect(within(dialog).getByLabelText('Name')).toHaveValue('Vorkath')
})

it('retires a card after confirmation and reports failures', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.mocked(retireCard).mockRejectedValueOnce(new Error('offline'))
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')

  await user.click(await screen.findByRole('button', { name: 'Retire Vorkath' }))

  expect(confirm).toHaveBeenCalled()
  expect(vi.mocked(retireCard).mock.calls[0][0]).toEqual({ cardId: CARD.id, expectedRevision: 1 })
  expect(await screen.findByText('The service is unavailable. Try again.')).toBeInTheDocument()
  confirm.mockRestore()
})
