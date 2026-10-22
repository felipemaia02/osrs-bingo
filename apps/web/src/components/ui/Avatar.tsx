const SIZE_CLASS = {
  sm: 'size-6 text-[11px]',
  md: 'size-7 text-xs',
  lg: 'size-9 text-sm',
} as const

/** Circle with the name's first letter and a `border-strong` ring (design system avatars). */
export function Avatar({ name, size = 'sm' }: { name: string; size?: keyof typeof SIZE_CLASS }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-rs-border-strong bg-rs-raised font-bold text-rs-gold-bright ${SIZE_CLASS[size]}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
