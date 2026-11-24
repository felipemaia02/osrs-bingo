/**
 * One-hue progress shades for maps and matrices (feature 077): not started, four gold steps
 * light → dark, and complete (green + ✓, never colour alone).
 */
const SHADES = ['bg-rs-gold/20', 'bg-rs-gold/40', 'bg-rs-gold/60', 'bg-rs-gold/80'] as const
const STEP_COUNT = SHADES.length

export type ProgressState = 'none' | 'partial' | 'complete'

export function progressRatio(value: number, requirement: number): number {
  return requirement > 0 ? Math.min(value / requirement, 1) : 0
}

export function progressState(value: number, complete: boolean): ProgressState {
  if (complete) return 'complete'
  return value > 0 ? 'partial' : 'none'
}

/** Square/cell classes for a progress value. */
export function progressShade(value: number, requirement: number, complete: boolean): string {
  const state = progressState(value, complete)
  if (state === 'complete') return 'border-rs-success bg-rs-success-bg text-rs-success-text'
  if (state === 'none') return 'border-rs-border/60 bg-rs-inset text-rs-muted'
  const step = Math.min(Math.floor(progressRatio(value, requirement) * STEP_COUNT), STEP_COUNT - 1)
  return `border-rs-gold/60 ${SHADES[step]} text-rs-text`
}

/** Legend swatches, in order. */
export const LEGEND_SHADES = {
  none: 'border-rs-border/60 bg-rs-inset',
  partial: 'border-rs-gold/60 bg-rs-gold/40',
  complete: 'border-rs-success bg-rs-success-bg',
} as const
