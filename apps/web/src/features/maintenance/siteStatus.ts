import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSiteStatus } from './siteStatusApi'

/** Fired by the API client when a request is refused for maintenance (feature 028). */
export const MAINTENANCE_EVENT = 'bingo:maintenance'
const STATUS_KEY = ['site-status'] as const
const STATUS_REFRESH_MS = 60_000

/** Whether the site is in maintenance; re-checked every minute, on focus and on a 503. */
export function useSiteStatus() {
  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: fetchSiteStatus,
    refetchInterval: STATUS_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
  const { refetch } = status
  useEffect(() => {
    const recheck = () => void refetch()
    window.addEventListener(MAINTENANCE_EVENT, recheck)
    return () => window.removeEventListener(MAINTENANCE_EVENT, recheck)
  }, [refetch])
  return status
}
