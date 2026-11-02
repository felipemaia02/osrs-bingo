import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { DateTimeField } from '../../src/components/ui/DateTimeField'
import '../../src/lib/i18n'
import { renderApp } from '../render'

/** A number on the clock face (the header also shows the hour and minute as buttons). */
function mark(dialog: HTMLElement, name: string): HTMLElement {
  return within(dialog)
    .getAllByRole('button', { name })
    .find((button) => button.style.transform)!
}

function angleOf(element: HTMLElement): string | undefined {
  return element.style.transform.match(/rotate\((-?\d+)deg\)/)?.[1]
}

describe('DateTimeField clock', () => {
  it('puts 12 at the top and points the hand at the chosen hour', async () => {
    const user = userEvent.setup()
    renderApp(
      <DateTimeField label="Start" value={dayjs('2026-11-02T16:15:00')} onChange={() => {}} />,
    )

    await user.click(screen.getByRole('button', { name: 'Start time' }))
    const dialog = screen.getByRole('dialog', { name: 'Select time' })
    expect(angleOf(mark(dialog, '12'))).toBe('0')
    expect(angleOf(mark(dialog, '3'))).toBe('90')
    expect(angleOf(mark(dialog, '4'))).toBe('120')
    // The hand hangs down by default: 4 o'clock is 180° + 120°.
    const hand = dialog.querySelector<HTMLElement>('.origin-top')!
    expect(angleOf(hand)).toBe('300')

    await user.click(within(dialog).getByRole('button', { name: '4' }))
    expect(angleOf(mark(dialog, '00'))).toBe('0')
    expect(angleOf(mark(dialog, '15'))).toBe('90')
  })
})
