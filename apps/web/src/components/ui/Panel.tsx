import type { HTMLAttributes, ReactNode } from 'react'

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  as?: 'aside' | 'div' | 'section'
}

export function Panel({ as: Component = 'div', children, className = '', ...props }: PanelProps) {
  return (
    <Component
      className={`rounded border border-rs-border/70 bg-rs-surface shadow-rs-panel ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}
