import type { ReactNode } from 'react'

/** Badge tones from docs/design/design-system.md ("Badges"). */
export type BadgeTone = 'success' | 'gold' | 'danger' | 'danger-outline' | 'info' | 'neutral'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const TONE_CLASS: Record<BadgeTone, string> = {
  success: 'border-rs-success bg-rs-success-bg text-rs-success-text',
  gold: 'border-rs-border-strong bg-rs-warning-bg text-rs-gold-bright',
  danger: 'border-rs-danger bg-rs-danger-bg text-rs-danger-text',
  'danger-outline': 'border-rs-danger bg-transparent text-rs-danger-text',
  info: 'border-rs-info bg-rs-info-bg text-rs-info-text',
  neutral: 'border-rs-border bg-rs-raised text-rs-text',
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] border px-1.5 py-px text-[11px] font-semibold leading-normal ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
