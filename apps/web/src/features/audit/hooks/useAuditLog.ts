import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchAuditLog } from '../api/auditApi'
import type { AuditFilters } from '../types'

export function useAuditLog(filters: AuditFilters) {
  return useInfiniteQuery({
    queryKey: ['audit', filters],
    queryFn: ({ pageParam }) => fetchAuditLog(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
  })
}
