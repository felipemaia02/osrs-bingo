import { fireEvent, render, screen } from '@testing-library/react'
import '../../src/lib/i18n'
import i18n from '../../src/lib/i18n'
import { ScoreTally } from '../../src/features/bingo/components/ScoreTally'
import { TileCard } from '../../src/features/bingo/components/TileCard'
import { MOCK_TILES, type Tile } from '../../src/features/bingo/data/tiles'
import { HomePage } from '../../src/features/bingo/pages/HomePage'
import { renderApp } from '../render'

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
        await i18n.changeLanguage('en')
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

    it('renders a complete page hierarchy and a readable mobile board region', () => {
        renderApp(<HomePage />)

        expect(screen.getByRole('banner')).toBeInTheDocument()
        expect(screen.getByRole('main')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Bingo board', level: 1 })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Objectives', level: 2 })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Score summary', level: 2 })).toBeInTheDocument()

        const scrollRegion = screen.getByLabelText('Scrollable Bingo board')
        expect(scrollRegion).toHaveClass('overflow-x-auto')
        expect(scrollRegion.firstElementChild).toHaveClass('min-w-[62rem]')
        expect(screen.getAllByRole('article')).toHaveLength(36)
    })
})
