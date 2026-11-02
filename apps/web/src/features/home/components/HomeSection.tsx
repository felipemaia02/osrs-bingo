import type { ReactNode } from 'react'
import { Panel } from '../../../components/ui/Panel'

/** A titled Home panel. */
export function HomeSection({
  id,
  title,
  children,
  className = '',
}: {
  id: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <Panel as="section" aria-labelledby={id} className={`flex flex-col gap-3 p-4 ${className}`}>
      <h2 id={id} className="m-0 font-display text-lg text-rs-gold-bright">
        {title}
      </h2>
      {children}
    </Panel>
  )
}
