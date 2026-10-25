const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] border px-4 text-sm md:min-h-10'

/** Design-system button looks for links and buttons on status screens. */
export const STATUS_BUTTON_CLASS = {
  primary: `${BASE} border-rs-gold bg-rs-gold font-semibold text-rs-canvas hover:bg-rs-gold-bright`,
  secondary: `${BASE} border-rs-border bg-rs-surface text-rs-text hover:border-rs-border-strong`,
}
