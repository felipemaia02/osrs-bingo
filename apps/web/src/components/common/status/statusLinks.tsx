import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { STATUS_BUTTON_CLASS } from './statusStyles'

const { primary: PRIMARY, secondary: SECONDARY } = STATUS_BUTTON_CLASS

/** Link styled as a design-system button for status screens. */
export function StatusLink({
  to,
  primary = false,
  children,
}: {
  to: string
  primary?: boolean
  children: ReactNode
}) {
  return (
    <Link to={to} className={primary ? PRIMARY : SECONDARY}>
      {children}
    </Link>
  )
}

/** Plain anchor for screens rendered outside the router (the crash screen). */
export function StatusAnchor({
  href,
  primary = false,
  children,
}: {
  href: string
  primary?: boolean
  children: ReactNode
}) {
  return (
    <a href={href} className={primary ? PRIMARY : SECONDARY}>
      {children}
    </a>
  )
}
