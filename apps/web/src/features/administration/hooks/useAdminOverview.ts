import { useQuery } from '@tanstack/react-query'
import { DEFAULT_BOARD_SIZE } from '../../boards/draft'
import { useAdminBoard } from '../../boards/hooks/useBoards'
import { useCards } from '../../cards/hooks/useCards'
import { useEvents } from '../../events/hooks/useEvents'
import { useDraftRegistrationCounts } from '../../teams/hooks/useDraftRegistrationCounts'
import { fetchUsers } from '../api/administrationApi'

export interface AdminOverview {
  events: { active: number; draft: number; finished: number } | null
  registrations: { pending: number; unassigned: number } | null
  cards: { active: number; retired: number } | null
  /** Most recently created draft event's board fill; null when there is no draft event. */
  draftBoard: { eventName: string; filled: number; total: number } | null
  administrators: number | null
}

/** Status badges for the administration overview. Each value is null when unavailable. */
export function useAdminOverview(): AdminOverview {
  const events = useEvents()
  const cards = useCards(true)
  const registrations = useDraftRegistrationCounts(true)
  const latestDraft = events.data?.find((event) => event.status === 'draft') ?? null
  const board = useAdminBoard(latestDraft?.id ?? null)
  const directory = useQuery({
    queryKey: ['administration', 'users', 'count'],
    queryFn: () => fetchUsers('', 0, 1),
  })

  const countStatus = (status: string) =>
    (events.data ?? []).filter((event) => event.status === status).length

  return {
    events: events.data
      ? {
          active: countStatus('active'),
          draft: countStatus('draft'),
          finished: countStatus('finished'),
        }
      : null,
    registrations,
    cards: cards.data
      ? {
          active: cards.data.filter((card) => card.status === 'active').length,
          retired: cards.data.filter((card) => card.status === 'retired').length,
        }
      : null,
    draftBoard:
      latestDraft && board.isSuccess
        ? {
            eventName: latestDraft.name,
            filled: board.data?.positions.length ?? 0,
            total: (board.data?.size ?? DEFAULT_BOARD_SIZE) ** 2,
          }
        : null,
    administrators: directory.data?.admin_count ?? null,
  }
}
