import { render, screen } from '@testing-library/react'
import { ProgressBar } from '../../src/components/ui/ProgressBar'

describe('UI primitives', () => {
    it('clamps visual progress while preserving the supplied value', () => {
        render(<ProgressBar value={12} max={10} label="Tile progress" complete />)

        const progress = screen.getByRole('progressbar', { name: 'Tile progress' })
        expect(progress).toHaveAttribute('aria-valuenow', '12')
        expect(progress.firstElementChild).toHaveStyle({ width: '100%' })
    })
})
