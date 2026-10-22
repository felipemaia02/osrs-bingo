import { useEffect, useState } from 'react'

/** Tailwind's `md` breakpoint: desktop layouts start here. */
const DESKTOP_QUERY = '(min-width: 768px)'

function matches(): boolean {
  // Without matchMedia (tests, old browsers) the desktop layout is the safe default.
  return typeof window.matchMedia !== 'function' || window.matchMedia(DESKTOP_QUERY).matches
}

/** True on desktop widths; updates when the viewport crosses the breakpoint. */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(matches)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(DESKTOP_QUERY)
    const update = () => setIsDesktop(query.matches)
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return isDesktop
}
