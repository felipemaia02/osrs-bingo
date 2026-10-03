import type { ReactNode } from 'react'

type BadgeTone = 'danger' | 'gold' | 'muted' | 'success'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
}

const TONE_CLASS: Record<BadgeTone, string> = {
  danger: 'border-rs-danger/50 bg-rs-danger/15 text-rs-text',
  gold: 'border-rs-gold/50 bg-rs-gold/10 text-rs-gold-bright',
  muted: 'border-rs-border/60 bg-rs-inset text-rs-muted',
  success: 'border-rs-success/50 bg-rs-success/15 text-rs-text',
}

export function Badge({ children, tone = 'muted' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  )
}
