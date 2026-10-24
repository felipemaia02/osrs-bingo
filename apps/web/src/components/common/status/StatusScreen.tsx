import type { ReactNode } from 'react'

interface StatusScreenProps {
  icon: ReactNode
  eyebrow: string
  title: string
  message: string
  actions: ReactNode
  /** Danger tint for crashes; gold for everything else. */
  tone?: 'gold' | 'danger'
}

/** Themed dead-end screen: framed panel, big icon, Cinzel title and a way out (feature 027). */
export function StatusScreen({
  icon,
  eyebrow,
  title,
  message,
  actions,
  tone = 'gold',
}: StatusScreenProps) {
  const ring =
    tone === 'danger'
      ? 'border-rs-danger bg-rs-danger-bg text-rs-danger-text'
      : 'border-rs-border-strong bg-rs-raised text-rs-gold'
  return (
    <section
      aria-labelledby="status-title"
      className="mx-auto mt-6 flex w-full max-w-lg flex-col items-center gap-3 rounded border border-rs-border-strong bg-rs-surface px-6 py-9 text-center shadow-rs-panel md:mt-14 md:px-10"
    >
      <span
        aria-hidden="true"
        className={`inline-flex size-20 items-center justify-center rounded-full border-2 [&_svg]:!text-[44px] ${ring}`}
      >
        {icon}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-rs-gold md:text-xs">
        {eyebrow}
      </span>
      <h1
        id="status-title"
        className="m-0 font-display text-[26px] font-bold leading-[1.15] text-rs-gold-bright md:text-[32px]"
      >
        {title}
      </h1>
      <p className="m-0 max-w-sm text-sm text-rs-muted md:text-[15px]">{message}</p>
      <div className="mt-2 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
        {actions}
      </div>
    </section>
  )
}
