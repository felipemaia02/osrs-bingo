import { fireEvent, render, screen } from '@testing-library/react'
import { LoadingImage } from '../../src/components/ui/LoadingImage'

describe('LoadingImage (053)', () => {
  it('keeps the image hidden behind a placeholder until it loads', () => {
    const { container } = render(
      <LoadingImage src="/shot.png" alt="Screenshot" className="max-h-full" onFail={vi.fn()} />,
    )
    const image = screen.getByRole('img', { name: 'Screenshot' })
    expect(image).toHaveClass('opacity-0')
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true')

    fireEvent.load(image)

    expect(image).toHaveClass('opacity-100')
    expect(container.firstChild).toHaveAttribute('aria-busy', 'false')
    expect(container.querySelector('.animate-pulse, [class*="animate-pulse"]')).toBeNull()
  })

  it('tells the caller when the image fails', () => {
    const onFail = vi.fn()
    render(<LoadingImage src="/missing.png" alt="Card" className="" onFail={onFail} />)
    fireEvent.error(screen.getByRole('img', { name: 'Card' }))
    expect(onFail).toHaveBeenCalledOnce()
  })
})
