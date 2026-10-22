import type { ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'primary' | 'danger' | 'ghost'
type Size = 'md' | 'sm' | 'icon'

const VARIANT_CLASS: Record<Variant, string> = {
  default: 'border-rs-border bg-rs-surface text-rs-text hover:border-rs-border-strong',
  primary: 'border-rs-gold bg-rs-gold font-semibold text-rs-canvas hover:bg-rs-gold-bright',
  danger: 'border-rs-danger bg-rs-surface text-rs-danger-text hover:bg-rs-danger-bg',
  ghost: 'border-transparent bg-transparent text-rs-text hover:bg-rs-surface',
}

/** Design-system sizes: 40 px desktop / 44 px mobile, 34 px small, square icon buttons. */
const SIZE_CLASS: Record<Size, string> = {
  md: 'min-h-11 px-3.5 text-sm md:min-h-10',
  sm: 'min-h-[34px] px-2.5 text-[13px]',
  icon: 'size-11 md:size-[34px]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

/** Shared button (design: `.btn`, `.btn.p`, `.btn.dg`, `.btn.sm`, `.btn.ic`). */
export function Button({
  variant = 'default',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] border disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
      {...props}
    />
  )
}
