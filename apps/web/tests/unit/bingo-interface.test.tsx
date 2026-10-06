import { fireEvent, render, screen } from '@testing-library/react'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { ScoreTally } from '../../src/features/bingo/components/ScoreTally'
import { TileCard } from '../../src/features/bingo/components/TileCard'
import { MOCK_TILES, type Tile } from '../../src/features/bingo/data/tiles'
import { HomePage } from '../../src/features/bingo/pages/HomePage'
import { renderApp } from '../render'
import { fetchEvents } from '../../src/features/events/api/eventsApi'
import { fetchPublicBoard } from '../../src/features/boards/api/boardsApi'
import type { EventBoard } from '../../src/features/boards/types'
import type { BingoEvent } from '../../src/features/events/types'

const TILE: Tile = {
    id: 'test-tile',
    row: 1,
    col: 1,
    name: 'Test objective',
    tier: 'Mid',
    points: 10,
    requirement: 8,
    progress: 3,
}

describe('Bingo interface', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        await i18n.changeLanguage('en')
        vi.mocked(fetchEvents).mockResolvedValue([])
        vi.mocked(fetchPublicBoard).mockResolvedValue(null)
    })

    it('preserves the prototype score calculation', () => {
        render(<ScoreTally tiles={MOCK_TILES} />)

        expect(screen.getByText('16 of 36 completed')).toBeInTheDocument()
        expect(screen.getAllByText('145')).toHaveLength(2)
        expect(screen.getAllByText('0')).toHaveLength(2)
    })

    it('communicates tile state and progress without relying only on color', () => {
        render(<TileCard tile={TILE} />)

        expect(screen.getByRole('article', { name: 'Test objective: In progress' })).toBeInTheDocument()
        expect(screen.getByText('Medium')).toBeInTheDocument()
        expect(screen.getByText('10 pts')).toBeInTheDocument()
        expect(screen.getByRole('progressbar', { name: 'Progress for Test objective' })).toHaveAttribute(
            'aria-valuenow',
            '3',
        )
    })

    it('replaces a failed image with the themed fallback', () => {
        const { container } = render(<TileCard tile={TILE} imageUrl="https://example.invalid/tile.png" />)

        const image = container.querySelector('img')
        expect(image).not.toBeNull()
        fireEvent.error(image!)
        expect(screen.getByText('Image unavailable')).toBeInTheDocument()
    })

    it('renders the persisted event board without prototype scoring', async () => {
        const event: BingoEvent = {
            id: 'event-1',
            name: 'Summer Bingo',
            description: null,
            status: 'active',
            start_at: '2026-10-03T12:00:00Z',
            end_at: '2026-10-10T12:00:00Z',
            created_at: '2026-10-01T12:00:00Z',
            updated_at: '2026-10-03T12:00:00Z',
        }
        const board: EventBoard = {
            event_id: event.id,
            status: 'published',
            revision: 1,
            complete: true,
            created_at: event.created_at,
            updated_at: event.updated_at,
            published_at: event.updated_at,
            positions: Array.from({ length: 36 }, (_, index) => ({
                position: index + 1,
                row: Math.floor(index / 6) + 1,
                column: (index % 6) + 1,
                card: {
                    card_id: `card-${index + 1}`,
                    slug: `card-${index + 1}`,
                    card_revision: 1,
                    name: `Objective ${index + 1}`,
                    description: null,
                    kind: 'boss',
                    difficulty: 'Low',
                    tile_score: 5,
                    completion_requirement: 6,
                    drops: [],
                    wiki_image: null,
                    fallback_image_accepted: true,
                    rule_note: null,
                    provenance: {
                        source: 'admin',
                        source_ref: null,
                        source_cells: [],
                        derived_from_revision: null,
                    },
                },
            })),
        }
        vi.mocked(fetchEvents).mockResolvedValue([event])
        vi.mocked(fetchPublicBoard).mockResolvedValue(board)
        renderApp(<HomePage />)

        expect(screen.getByRole('banner')).toBeInTheDocument()
        expect(screen.getByRole('main')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Bingo board', level: 1 })).toBeInTheDocument()
        expect(await screen.findByRole('heading', { name: 'Objectives', level: 2 })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Score summary', level: 2 })).not.toBeInTheDocument()

        const scrollRegion = screen.getByLabelText('Scrollable Bingo board')
        expect(scrollRegion).toHaveClass('overflow-x-auto')
        expect(scrollRegion.firstElementChild).toHaveClass('min-w-[62rem]')
        expect(screen.getAllByRole('article')).toHaveLength(36)
        expect(screen.getAllByText('Progress unavailable')).toHaveLength(36)
    })
})
