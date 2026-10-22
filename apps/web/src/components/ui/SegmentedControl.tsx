import type { ReactNode } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  /** Accessible name when the label is an icon. */
  ariaLabel?: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: Array<SegmentOption<T>>
  value: T
  onChange: (value: T) => void
  /** Desktop segmented bar, or rounded chips for mobile. */
  variant?: 'segment' | 'chip'
}

/** Single-choice button group with `aria-pressed` (design: `.seg` and `.chip`). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  variant = 'segment',
}: SegmentedControlProps<T>) {
  if (variant === 'chip') {
    return (
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              aria-label={option.ariaLabel}
              onClick={() => onChange(option.value)}
              className={`min-h-9 rounded-full border px-3 text-[13px] ${
                active
                  ? 'border-rs-gold bg-rs-raised font-semibold text-rs-gold-bright'
                  : 'border-rs-border bg-rs-inset text-rs-text'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex overflow-hidden rounded-[3px] border border-rs-border"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-[38px] items-center border-r border-rs-border px-3 text-[13px] last:border-r-0 ${
              active
                ? 'bg-rs-raised font-semibold text-rs-gold-bright shadow-[inset_0_-2px_0_theme(colors.rs.gold)]'
                : 'bg-rs-inset text-rs-text'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
