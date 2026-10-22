import { useEffect, useState } from 'react'

const MINUTE_MS = 60_000

/** Current time in ms, refreshed every minute: enough for day/hour/minute countdowns. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE_MS)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
