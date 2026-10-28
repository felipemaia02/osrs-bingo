import { fireEvent, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import i18n from '../../src/lib/i18n'
import { AppRouter } from '../../src/app/router'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import {
  createCardRevision,
  fetchCards,
  importWorkbookCatalog,
  linkCatalogItems,
  previewDropMatches,
  resolveWikiImage,
  retireCard,
  searchItems,
} from '../../src/features/cards/api/cardsApi'
import {
  fetchAdminBoard,
  saveBoard,
  updateBoardPosition,
} from '../../src/features/boards/api/boardsApi'
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
    size: 6,
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
      size: 6,
      row_bonus: null,
      column_bonus: null,
      bonus_slots: 0,
      positions: [{ position: 1, card_id: CARD.id, card_revision: 1 }],
    },
  })
})

describe('board builder v2', () => {
  function card(
    id: string,
    name: string,
    difficulty: CardSummary['revision']['difficulty'],
    extra: Partial<CardSummary> = {},
  ): CardSummary {
    return {
      ...CARD,
      id,
      slug: id,
      ...extra,
      revision: { ...CARD.revision, name, difficulty, ...(extra.revision ?? {}) },
    }
  }
  const HYDRA = card('66d000000000000000000011', 'Alchemical Hydra', 'High', {
    revision: {
      ...CARD.revision,
      name: 'Alchemical Hydra',
      difficulty: 'High',
      tile_score: 20,
      completion_requirement: 6,
      drops: [
        { ...CARD.revision.drops[0], key: 'claw', name: "Hydra's Claw", progress_weight: 3 },
        { ...CARD.revision.drops[0], key: 'tail', name: "Hydra's Tail", progress_weight: 2 },
        { ...CARD.revision.drops[0], key: 'leather', name: "Hydra's Leather", progress_weight: 2 },
      ],
      categories: ['slayer_bosses'],
    },
  })
  const BARROWS = card('66d000000000000000000012', 'Barrows', 'Low', {
    revision: { categories: ['minigames'] } as Partial<
      CardSummary['revision']
    > as CardSummary['revision'],
  })
  const RETIRED = card('66d000000000000000000013', 'Kalphite Queen', 'Mid', { status: 'retired' })

  function boardWith(placed: Array<[number, CardSummary]>, size = 6) {
    return {
      event_id: EVENT.id,
      status: 'draft' as const,
      revision: 4,
      size,
      complete: false,
      positions: placed.map(([position, placedCard]) => ({
        position,
        row: Math.floor((position - 1) / size) + 1,
        column: ((position - 1) % size) + 1,
        card: {
          ...placedCard.revision,
          card_id: placedCard.id,
          slug: placedCard.slug,
          card_revision: placedCard.current_revision,
        },
      })),
      created_at: EVENT.created_at,
      updated_at: EVENT.updated_at,
      published_at: null,
    }
  }

  async function openBuilder(placed: Array<[number, CardSummary]> = [[1, CARD]]) {
    vi.mocked(fetchCards).mockResolvedValue([CARD, HYDRA, BARROWS, RETIRED])
    vi.mocked(fetchAdminBoard).mockResolvedValue(boardWith(placed))
    const user = userEvent.setup()
    renderApp(<AppRouter />, '/admin/boards')
    await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
    await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
    await screen.findByRole('region', { name: 'Board being built' })
    return user
  }

  const grid = () => screen.getByRole('region', { name: 'Board being built' })

  it('shows the status panel, the full grid with empty slots and the catalog', async () => {
    await openBuilder()

    expect(screen.getByText('Draft · editable')).toBeInTheDocument()
    expect(screen.getByText('1 of 36')).toBeInTheDocument()
    expect(screen.getByText('positions filled · 35 empty')).toBeInTheDocument()
    expect(screen.getByText('Hard 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fill empty slots (2)' })).toBeEnabled()
    expect(within(grid()).getAllByRole('button', { name: /empty — choose card$/ })).toHaveLength(35)
    expect(
      within(grid()).getByRole('button', { name: 'Position 1·1: Vorkath, Hard. Drag to move.' }),
    ).toBeInTheDocument()
    const catalog = screen.getByRole('region', { name: 'Card catalog' })
    expect(catalog).toHaveTextContent('3 active · 1 retired')
    expect(within(catalog).getByText('Kalphite Queen').closest('div')).toHaveTextContent('Retired')
    expect(within(catalog).queryByRole('button', { name: 'Add Kalphite Queen' })).toBeNull()
    expect(within(catalog).queryByRole('button', { name: 'Add Vorkath' })).toBeNull()
  })

  it('adds a card to the selected empty slot and saves the exact revisions', async () => {
    vi.mocked(saveBoard).mockResolvedValue(
      boardWith([
        [1, CARD],
        [4, HYDRA],
      ]),
    )
    const user = await openBuilder()

    await user.click(
      within(grid()).getByRole('button', { name: 'Position 1·4 empty — choose card' }),
    )
    await user.click(screen.getByRole('button', { name: 'Add Alchemical Hydra' }))
    expect(
      within(grid()).getByRole('button', { name: /^Position 1·4: Alchemical Hydra/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save board' }))
    expect(vi.mocked(saveBoard).mock.calls[0][0]).toEqual({
      eventId: EVENT.id,
      payload: {
        expected_revision: 4,
        size: 6,
        row_bonus: null,
        column_bonus: null,
        bonus_slots: 0,
        positions: [
          { position: 1, card_id: CARD.id, card_revision: 1 },
          { position: 4, card_id: HYDRA.id, card_revision: 1 },
        ],
      },
    })
  })

  it('moves cards by dragging, accepts catalog drops on empty slots and removes cards', async () => {
    const user = await openBuilder()

    const vorkath = within(grid()).getByRole('button', { name: /^Position 1·1: Vorkath/ })
    fireEvent.dragStart(vorkath.parentElement!, { dataTransfer: { setData: vi.fn() } })
    const target = within(grid()).getByRole('button', { name: 'Position 2·2 empty — choose card' })
    fireEvent.dragOver(target)
    fireEvent.drop(target)
    expect(
      within(grid()).getByRole('button', { name: /^Position 2·2: Vorkath/ }),
    ).toBeInTheDocument()

    const hydraItem = screen.getByText('Alchemical Hydra').closest('[draggable="true"]')!
    fireEvent.dragStart(hydraItem, { dataTransfer: { setData: vi.fn() } })
    const empty = within(grid()).getByRole('button', { name: 'Position 1·1 empty — choose card' })
    fireEvent.dragOver(empty)
    expect(within(grid()).getByText('Drop Alchemical Hydra on 1·1')).toBeInTheDocument()
    fireEvent.drop(within(grid()).getByText('Drop Alchemical Hydra on 1·1'))
    expect(
      within(grid()).getByRole('button', { name: /^Position 1·1: Alchemical Hydra/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Vorkath from this position' }))
    expect(within(grid()).queryByRole('button', { name: /: Vorkath/ })).toBeNull()
  })

  it('fills empty slots in catalog order and clears the board after confirmation', async () => {
    const user = await openBuilder()

    await user.click(screen.getByRole('button', { name: 'Fill empty slots (2)' }))
    expect(screen.getByText('3 of 36')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fill empty slots (0)' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    const dialog = screen.getByRole('dialog', { name: 'Clear the board?' })
    await user.click(within(dialog).getByRole('button', { name: 'Clear' }))
    expect(screen.getByText('0 of 36')).toBeInTheDocument()
    expect(saveBoard).not.toHaveBeenCalled()
  })

  it('preselects the event from the Events page shortcut', async () => {
    vi.mocked(fetchCards).mockResolvedValue([CARD])
    vi.mocked(fetchAdminBoard).mockResolvedValue(boardWith([[1, CARD]]))
    renderApp(<AppRouter />, `/admin/boards?event=${EVENT.id}`)

    expect(await screen.findByRole('region', { name: 'Board being built' })).toBeInTheDocument()
    expect(screen.getByLabelText('Event')).toHaveValue(EVENT.id)
  })

  it('changes the board size, confirming before cards outside the new area are removed', async () => {
    vi.mocked(saveBoard).mockResolvedValue(boardWith([[1, CARD]], 4))
    const user = await openBuilder([
      [1, CARD],
      [5, HYDRA],
    ])
    const sizes = screen.getByRole('group', { name: 'Board size' })
    expect(within(sizes).getByRole('button', { name: '6×6' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(within(sizes).getByRole('button', { name: '4×4' }))
    const dialog = screen.getByRole('dialog', { name: 'Shrink to 4×4?' })
    expect(dialog).toHaveTextContent(
      '1 card is outside the 4×4 area and will be removed from the draft: Alchemical Hydra.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('2 of 36')).toBeInTheDocument()

    await user.click(within(sizes).getByRole('button', { name: '4×4' }))
    await user.click(screen.getByRole('button', { name: 'Shrink and remove' }))
    expect(screen.getByText('1 of 16')).toBeInTheDocument()
    expect(within(grid()).getAllByRole('button', { name: /empty — choose card$/ })).toHaveLength(15)
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save board' }))
    expect(vi.mocked(saveBoard).mock.calls[0][0].payload).toEqual({
      expected_revision: 4,
      size: 4,
      row_bonus: null,
      column_bonus: null,
      bonus_slots: 0,
      positions: [{ position: 1, card_id: CARD.id, card_revision: 1 }],
    })
  })

  it('saves the row and column bonuses with the board', async () => {
    vi.mocked(saveBoard).mockResolvedValue({
      ...boardWith([[1, CARD]]),
      row_bonus: 25,
      column_bonus: 0,
    })
    const user = await openBuilder()
    expect(screen.getByText('Both are required to activate')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Row bonus'), '25')
    await user.type(screen.getByLabelText('Column bonus'), '0')
    expect(screen.queryByText('Both are required to activate')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Save board' }))

    expect(vi.mocked(saveBoard).mock.calls[0][0].payload).toMatchObject({
      row_bonus: 25,
      column_bonus: 0,
    })
  })

  it('adds a bonus row, fills a bonus slot and confirms before removing it', async () => {
    vi.mocked(saveBoard).mockResolvedValue(boardWith([[1, CARD]]))
    const user = await openBuilder()

    await user.click(screen.getByRole('button', { name: 'Add bonus row' }))
    const bonusRow = screen.getByRole('group', { name: 'Bonus row' })
    await user.click(screen.getByRole('button', { name: 'One bonus card more' }))
    expect(within(bonusRow).getAllByRole('button', { name: /empty — choose card$/ })).toHaveLength(
      2,
    )
    expect(screen.getByText('1 of 38')).toBeInTheDocument()

    await user.click(
      within(bonusRow).getByRole('button', { name: 'Position Bonus 1 empty — choose card' }),
    )
    await user.click(screen.getByRole('button', { name: 'Add Alchemical Hydra' }))
    expect(
      within(bonusRow).getByRole('button', { name: /^Position Bonus 1: Alchemical Hydra/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save board' }))
    expect(vi.mocked(saveBoard).mock.calls[0][0].payload).toMatchObject({
      bonus_slots: 2,
      positions: [
        { position: 1, card_id: CARD.id, card_revision: 1 },
        { position: 37, card_id: HYDRA.id, card_revision: 1 },
      ],
    })

    await user.click(screen.getByRole('button', { name: 'Remove bonus row' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove the bonus row?' })
    expect(dialog).toHaveTextContent('1 card will leave the bonus row: Alchemical Hydra.')
    await user.click(within(dialog).getByRole('button', { name: 'Remove cards' }))
    expect(screen.queryByRole('group', { name: 'Bonus row' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Add bonus row' })).toBeInTheDocument()
  })

  it('keeps rows and columns when the size changes without removing cards', async () => {
    const user = await openBuilder([[8, CARD]])
    const sizes = screen.getByRole('group', { name: 'Board size' })

    await user.click(within(sizes).getByRole('button', { name: '3×3' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      within(grid()).getByRole('button', { name: /^Position 2·2: Vorkath/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 of 9')).toBeInTheDocument()
  })

  it('filters the catalog, searches drop names and groups drops by weight', async () => {
    const user = await openBuilder()
    const catalog = screen.getByRole('region', { name: 'Card catalog' })

    await user.type(within(catalog).getByRole('searchbox'), 'claw')
    expect(within(catalog).getByText('Alchemical Hydra')).toBeInTheDocument()
    expect(within(catalog).queryByText('Barrows')).toBeNull()

    await user.click(within(catalog).getByText('Alchemical Hydra'))
    const rules = screen.getByRole('region', { name: 'Selected card rules' })
    expect(rules).toHaveTextContent('Completes at 6 progress · revision 1')
    expect(rules).toHaveTextContent("Hydra's Tail · Hydra's Leather+2 each")
    expect(rules).toHaveTextContent("Hydra's Claw+3")

    await user.clear(within(catalog).getByRole('searchbox'))
    // Feature 040: category filter.
    await user.selectOptions(within(catalog).getByLabelText('Category'), 'minigames')
    expect(within(catalog).getByText('Barrows')).toBeInTheDocument()
    expect(within(catalog).queryByText('Alchemical Hydra')).toBeNull()
    await user.selectOptions(within(catalog).getByLabelText('Category'), 'all')
    await user.click(within(catalog).getByRole('button', { name: 'On board (1)' }))
    expect(within(catalog).getByText('Vorkath')).toBeInTheDocument()
    expect(within(catalog).queryByText('Barrows')).toBeNull()
  })

  it('keeps a pinned snapshot when the catalog has a newer revision', async () => {
    vi.mocked(fetchCards).mockResolvedValue([
      {
        ...CARD,
        current_revision: 2,
        revision: { ...CARD.revision, revision: 2, name: 'New Vorkath' },
      },
    ])
    vi.mocked(fetchAdminBoard).mockResolvedValue(boardWith([[1, CARD]]))
    const user = userEvent.setup()
    renderApp(<AppRouter />, '/admin/boards')
    await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
    await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)

    const slot = await screen.findByRole('button', { name: /^Position 1·1: Vorkath,/ })
    expect(slot).not.toHaveTextContent('New Vorkath')
    expect(screen.queryByRole('button', { name: 'Add New Vorkath' })).toBeNull()
  })

  it('shows a stale save inside the page', async () => {
    vi.mocked(saveBoard).mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        data: { detail: 'Board changed while you were editing' },
      } as never),
    )
    const user = await openBuilder()
    await user.click(screen.getByRole('button', { name: 'Fill empty slots (2)' }))
    await user.click(screen.getByRole('button', { name: 'Save board' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This board changed while you were editing',
    )
  })

  it('keeps published events read-only', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([{ ...EVENT, status: 'active' }])
    vi.mocked(fetchCards).mockResolvedValue([CARD])
    vi.mocked(fetchAdminBoard).mockResolvedValue({ ...boardWith([[1, CARD]]), status: 'published' })
    const user = userEvent.setup()
    renderApp(<AppRouter />, '/admin/boards')
    await screen.findByRole('option', { name: 'Summer Bingo · Active' })
    await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)

    expect(await screen.findByText('Published · read-only')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save board' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Remove .* from this position$/ })).toBeNull()
    expect(screen.getAllByRole('button', { name: /empty — choose card$/ })[0]).toBeDisabled()
  })

  it('updates a live square to a newer card revision with a reason (036)', async () => {
    const fixed: CardSummary = {
      ...CARD,
      current_revision: 2,
      revision: { ...CARD.revision, revision: 2, completion_requirement: 6 },
    }
    vi.mocked(fetchEvents).mockResolvedValue([{ ...EVENT, status: 'active' }])
    vi.mocked(fetchCards).mockResolvedValue([fixed])
    vi.mocked(fetchAdminBoard).mockResolvedValue({ ...boardWith([[1, CARD]]), status: 'published' })
    vi.mocked(updateBoardPosition).mockResolvedValue({
      ...boardWith([[1, fixed]]),
      status: 'published',
    })
    const user = userEvent.setup()
    renderApp(<AppRouter />, '/admin/boards')
    await screen.findByRole('option', { name: 'Summer Bingo · Active' })
    await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)

    const fixes = await screen.findByRole('region', { name: 'Card fixes during the event' })
    expect(fixes).toHaveTextContent('Vorkath')
    expect(fixes).toHaveTextContent('rev. 1 → 2')
    await user.click(within(fixes).getByRole('button', { name: 'Review update' }))
    const dialog = screen.getByRole('dialog', { name: 'Update Vorkath on the live board' })
    expect(
      within(dialog).getByRole('rowheader', { name: /Progress requirement/ }),
    ).toHaveTextContent('changed')
    const confirm = within(dialog).getByRole('button', { name: 'Update square' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Reason players will see'), 'Typo: 6, not 8')
    await user.click(confirm)

    await waitFor(() => expect(updateBoardPosition).toHaveBeenCalledOnce())
    expect(vi.mocked(updateBoardPosition).mock.calls[0][0]).toEqual({
      eventId: EVENT.id,
      position: 1,
      cardRevision: 2,
      reason: 'Typo: 6, not 8',
    })
    expect(await screen.findByText('Vorkath updated on the live board.')).toBeInTheDocument()
  })

  it('offers catalog setup when no cards exist', async () => {
    vi.mocked(fetchCards).mockResolvedValue([])
    const user = userEvent.setup()
    renderApp(<AppRouter />, '/admin/boards')
    await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
    await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
    expect(await screen.findByRole('link', { name: 'Open card catalog' })).toHaveAttribute(
      'href',
      '/admin/cards',
    )
  })

  describe('mobile', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      )
    })
    afterEach(() => vi.unstubAllGlobals())

    async function openMobile() {
      vi.mocked(fetchCards).mockResolvedValue([CARD, HYDRA, BARROWS])
      vi.mocked(fetchAdminBoard).mockResolvedValue(boardWith([[1, CARD]]))
      const user = userEvent.setup()
      renderApp(<AppRouter />, '/admin/boards')
      await screen.findByRole('option', { name: 'Summer Bingo · Draft' })
      await user.selectOptions(screen.getByLabelText('Event'), EVENT.id)
      await screen.findByRole('region', { name: '1. Choose a position' })
      return user
    }

    it('picks a position first, then places a card on it', async () => {
      const user = await openMobile()
      expect(screen.getByText('Draft · 1/36')).toBeInTheDocument()
      const map = screen.getByRole('region', { name: '1. Choose a position' })
      expect(map).toHaveTextContent('35 empty')

      await user.click(
        within(map).getByRole('button', { name: 'Position 2·5 empty — choose card' }),
      )
      const picker = screen.getByRole('region', { name: 'Choose the card for 2·5' })
      await user.click(within(picker).getByRole('button', { name: /Alchemical Hydra/ }))
      expect(within(picker).getByText("Hydra's Claw", { exact: false })).toBeInTheDocument()
      await user.click(within(picker).getByRole('button', { name: 'Place on 2·5' }))

      expect(
        within(map).getByRole('button', { name: /^Position 2·5: Alchemical Hydra/ }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save board' })).toBeInTheDocument()
    })

    it('swaps and removes a filled position', async () => {
      const user = await openMobile()
      const map = screen.getByRole('region', { name: '1. Choose a position' })

      await user.click(within(map).getByRole('button', { name: /^Position 1·1: Vorkath/ }))
      await user.click(screen.getByRole('button', { name: 'Swap' }))
      expect(screen.getByText('Tap the position to swap with 1·1.')).toBeInTheDocument()
      await user.click(
        within(map).getByRole('button', { name: 'Position 3·3 empty — choose card' }),
      )
      expect(
        within(map).getByRole('button', { name: /^Position 3·3: Vorkath/ }),
      ).toBeInTheDocument()

      await user.click(within(map).getByRole('button', { name: /^Position 3·3: Vorkath/ }))
      await user.click(screen.getByRole('button', { name: 'Remove' }))
      expect(within(map).queryByRole('button', { name: /: Vorkath/ })).toBeNull()
    })
  })
})

it('opens creation in a modal and restores focus on Escape without saving', async () => {
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')
  const trigger = await screen.findByRole('button', { name: 'New card' })
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

  await user.click(await screen.findByRole('row', { name: 'Grotesque Guardians: show details' }))

  const panel = screen.getByRole('complementary', { name: 'Card details' })
  expect(within(panel).getByText('10 points when progress reaches 8')).toBeInTheDocument()
  expect(within(panel).getByText('rev. 1 · Initial')).toBeInTheDocument()
  expect(within(panel).getByText('Administrator')).toBeInTheDocument()
  const drop = within(panel).getByText('Granite Maul').closest('li')!
  expect(within(drop).getByText('+1 progress')).toBeInTheDocument()
  expect(within(drop).queryByText(/points/)).not.toBeInTheDocument()
})

const NECKLACE = {
  name: 'Dragonbone necklace',
  label: 'Dragonbone necklace',
  item_ids: [22111],
  icon_url: 'https://oldschool.runescape.wiki/images/Dragonbone_necklace.png',
  any_version: true,
  versions: 1,
}
const NESTS = [
  {
    name: 'Bird nest',
    label: 'Bird nest',
    item_ids: [5074, 5075, 22798],
    icon_url: null,
    any_version: true,
    versions: 3,
  },
  {
    name: 'Bird nest',
    label: 'Bird nest (seeds)',
    item_ids: [22798],
    icon_url: null,
    any_version: false,
    versions: 3,
  },
]

async function openEditor(
  drops = CARD.revision.drops,
  extra: Partial<CardSummary['revision']> = {},
) {
  vi.mocked(fetchCards).mockResolvedValue([
    { ...CARD, revision: { ...CARD.revision, drops, ...extra } },
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
  return { user, dialog }
}

async function save(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText('Reason for this revision'), 'Rebalance')
  await user.click(within(dialog).getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(createCardRevision).toHaveBeenCalledOnce())
  return vi.mocked(createCardRevision).mock.calls[0][0].payload
}

it('keeps drop keys and verification metadata and links a new drop picked from OSRS items', async () => {
  const noted = {
    ...CARD.revision.drops[0],
    key: 'visage-workbook-key',
    aliases: ['Visage'],
    verification_note: 'Screenshot required',
    counting_restriction: 'Once per team',
  }
  vi.mocked(searchItems).mockResolvedValue({ ready: true, items: [NECKLACE] })
  const { user, dialog } = await openEditor([noted])

  expect(within(dialog).getByText('Manual only')).toBeInTheDocument()
  const progress = within(dialog).getByLabelText('Progress for Skeletal Visage')
  await user.clear(progress)
  await user.type(progress, '3')
  await user.click(within(dialog).getByRole('button', { name: 'Add drop' }))
  await user.type(within(dialog).getByRole('combobox', { name: 'Drop 2' }), 'dragonb')
  await user.click(await within(dialog).findByRole('option', { name: /Dragonbone necklace/ }))

  expect(within(dialog).getByText('Auto-tracked')).toBeInTheDocument()
  expect(within(dialog).getByText(/Completes at 8 progress → 13 pts once/)).toHaveTextContent(
    'e.g. 3 × Skeletal Visage, or 8 × Dragonbone necklace.',
  )
  const payload = await save(user, dialog)
  expect(payload.drops).toEqual([
    { ...noted, progress_weight: 3, item_ids: [], match_by_name: true },
    {
      key: 'dragonbone-necklace',
      name: 'Dragonbone necklace',
      progress_weight: 1,
      aliases: [],
      verification_note: null,
      counting_restriction: null,
      item_ids: [22111],
      match_by_name: true,
    },
  ])
})

it('links only the IDs of a specific version and typing again unlinks the drop', async () => {
  vi.mocked(searchItems).mockResolvedValue({ ready: true, items: NESTS })
  const { user, dialog } = await openEditor()

  const field = within(dialog).getByRole('combobox', { name: 'Drop 1' })
  await user.clear(field)
  await user.type(field, 'bird')
  expect(
    await within(dialog).findByRole('option', { name: /any version · 3 versions/ }),
  ).toBeInTheDocument()
  await user.click(within(dialog).getByRole('option', { name: /Bird nest \(seeds\)/ }))
  expect(field).toHaveValue('Bird nest (seeds)')

  const payload = await save(user, dialog)
  expect(payload.drops[0]).toMatchObject({
    name: 'Bird nest (seeds)',
    item_ids: [22798],
    match_by_name: false,
  })
})

it('pastes a list, links the names found on the wiki and marks the rest Manual only', async () => {
  vi.mocked(searchItems).mockImplementation(async (query) => ({
    ready: true,
    items: query.toLowerCase().startsWith('dragonbone') ? [NECKLACE] : [],
  }))
  const { user, dialog } = await openEditor()

  await user.click(within(dialog).getByRole('button', { name: 'Paste list' }))
  await user.type(
    within(dialog).getByLabelText('One drop per line: Name | progress'),
    'dragonbone NECKLACE | 4{enter}Custom task',
  )
  await user.click(within(dialog).getByRole('button', { name: 'Add to list' }))

  expect(
    await within(dialog).findByText("1 line wasn't found on the OSRS Wiki: marked Manual only."),
  ).toBeInTheDocument()
  const payload = await save(user, dialog)
  expect(payload.drops.map((drop) => [drop.name, drop.progress_weight, drop.item_ids])).toEqual([
    ['Skeletal Visage', 2, []],
    ['Dragonbone necklace', 4, [22111]],
    ['Custom task', 1, []],
  ])
})

it('shows how many clan drops the card would have matched', async () => {
  vi.mocked(previewDropMatches).mockResolvedValue({
    available: true,
    days: 30,
    total: 14,
    per_drop: [14],
  })
  const { dialog } = await openEditor()

  expect(
    await within(dialog).findByText(
      '✓ This card would have matched 14 clan drops in the last 30 days.',
    ),
  ).toBeInTheDocument()
  expect(previewDropMatches).toHaveBeenCalledWith([
    { name: 'Skeletal Visage', aliases: [], item_ids: [], match_by_name: true },
  ])
})

it('flags cards with drops that are not linked and links them from the catalog', async () => {
  vi.mocked(linkCatalogItems).mockResolvedValue({
    linked_cards: 1,
    linked_drops: 1,
    unlinked_drops: 0,
    skipped_cards: [],
  })
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')

  expect(await screen.findByText('⚠ 1 drop not auto-tracked')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Link drops to OSRS items' }))

  expect(
    await screen.findByText(
      "Linked 1 drops on 1 cards. 0 drops weren't found on the OSRS Wiki and stay Manual only.",
    ),
  ).toBeInTheDocument()
})

it('filters the catalog by category and saves the categories of a card (040)', async () => {
  const { user, dialog } = await openEditor([CARD.revision.drops[0]], {
    categories: ['solo_bosses'],
  })
  expect(within(dialog).getByRole('checkbox', { name: 'Solo bosses' })).toBeChecked()
  await user.click(within(dialog).getByRole('checkbox', { name: 'Raids' }))
  const payload = await save(user, dialog)
  expect(payload.categories).toEqual(['solo_bosses', 'raids'])
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

it('retires a card after confirmation and reports failures inside the dialog', async () => {
  vi.mocked(retireCard).mockRejectedValueOnce(new Error('offline'))
  const user = userEvent.setup()
  renderApp(<AppRouter />, '/admin/cards')

  await user.click(await screen.findByRole('button', { name: 'Retire Vorkath' }))
  const dialog = screen.getByRole('dialog', { name: 'Retire card?' })
  expect(retireCard).not.toHaveBeenCalled()
  await user.click(within(dialog).getByRole('button', { name: 'Retire' }))

  expect(vi.mocked(retireCard).mock.calls[0][0]).toEqual({ cardId: CARD.id, expectedRevision: 1 })
  expect(
    await within(dialog).findByText('The service is unavailable. Try again.'),
  ).toBeInTheDocument()
})

describe('card catalog v2', () => {
  const HYDRA: typeof CARD = {
    ...CARD,
    id: '66d000000000000000000021',
    slug: 'alchemical-hydra',
    revision: {
      ...CARD.revision,
      name: 'Alchemical Hydra',
      difficulty: 'High',
      drops: [{ ...CARD.revision.drops[0], key: 'claw', name: "Hydra's Claw", aliases: ['claw'] }],
    },
  }
  const BARROWS: typeof CARD = {
    ...CARD,
    id: '66d000000000000000000022',
    slug: 'barrows',
    revision: { ...CARD.revision, name: 'Barrows', difficulty: 'Low' },
  }
  const RETIRED: typeof CARD = {
    ...CARD,
    id: '66d000000000000000000023',
    slug: 'kq',
    status: 'retired',
    revision: { ...CARD.revision, name: 'Kalphite Queen', difficulty: 'Mid' },
  }

  beforeEach(() => {
    vi.mocked(fetchCards).mockResolvedValue([CARD, HYDRA, BARROWS, RETIRED])
  })

  it('filters by status, difficulty and drop name without new requests', async () => {
    const user = userEvent.setup()
    renderApp(<AppRouter />, '/admin/cards')
    const status = await screen.findByRole('group', { name: 'Card status' })
    expect(screen.getByText('3 cards')).toBeInTheDocument()
    expect(screen.queryByText('Kalphite Queen')).toBeNull()
    const calls = vi.mocked(fetchCards).mock.calls.length

    await user.click(within(status).getByRole('button', { name: 'Retired (1)' }))
    expect(screen.getByText('Kalphite Queen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retire Kalphite Queen' })).toBeNull()

    await user.click(within(status).getByRole('button', { name: 'All (4)' }))
    await user.click(
      within(screen.getByRole('group', { name: 'Difficulty' })).getByRole('button', {
        name: 'Hard',
      }),
    )
    expect(screen.getByText('2 cards')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search cards or drops' }), 'CLAW')
    expect(screen.getByText('1 card')).toBeInTheDocument()
    expect(screen.getByText('Alchemical Hydra')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search cards or drops' }), 'zzz')
    expect(screen.getByText('No cards match these filters.')).toBeInTheDocument()
    expect(vi.mocked(fetchCards).mock.calls.length).toBe(calls)
  })

  it('shows easy, medium and hard labels in the editor', async () => {
    const user = userEvent.setup()
    renderApp(<AppRouter />, '/admin/cards')
    await user.click(await screen.findByRole('button', { name: 'New card' }))
    const dialog = screen.getByRole('dialog', { name: 'Create catalog card' })
    expect(within(dialog).getByRole('option', { name: 'Easy' })).toHaveValue('Low')
    expect(within(dialog).getByRole('option', { name: 'Hard' })).toHaveValue('High')
  })
})

it('publishes the pre-verification flag from the card editor', async () => {
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
  const flag = within(dialog).getByRole('checkbox', { name: /Requires pre-verification/ })
  expect(flag).not.toBeChecked()
  expect(within(dialog).queryByLabelText('Pre-verification instructions')).toBeNull()
  await user.click(flag)
  await user.type(
    within(dialog).getByLabelText('Pre-verification instructions'),
    'Screenshot your Vorkath KC before the event.',
  )
  await user.type(within(dialog).getByLabelText('Reason for this revision'), 'KC proof')
  await user.click(within(dialog).getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(createCardRevision).toHaveBeenCalledOnce())
  const payload = vi.mocked(createCardRevision).mock.calls[0][0].payload
  expect(payload.requires_preverification).toBe(true)
  expect(payload.rule_note).toBe('Screenshot your Vorkath KC before the event.')
})
