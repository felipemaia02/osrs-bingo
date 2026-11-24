import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveDraft } from '../../teams/api/teamsApi'
import type { DraftPreview } from '../../teams/types'
import {
  draftAssignments,
  hasChanges,
  newSession,
  restoreSession,
  type DraftSession,
} from '../session'

const STORAGE_PREFIX = 'osrs-bingo:draft:'

/** Storage can be blocked or full; the board still works without the local copy. */
function readStored(eventId: string): unknown {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + eventId)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function writeStored(eventId: string, session: DraftSession) {
  try {
    if (hasChanges(session))
      window.localStorage.setItem(STORAGE_PREFIX + eventId, JSON.stringify(session))
    else window.localStorage.removeItem(STORAGE_PREFIX + eventId)
  } catch {
    // Not kept for the next visit; nothing else depends on it.
  }
}

function initialSession(eventId: string, preview: DraftPreview): DraftSession {
  const teamIds = preview.captains.map((team) => team.team_id)
  const playerIds = new Set([...preview.players, ...preview.members].map((player) => player.id))
  return restoreSession(readStored(eventId), teamIds, playerIds) ?? newSession(teamIds)
}

/** The draft board's session (076): kept in the browser until "Save teams" sends it. */
export function useDraftSession(eventId: string, preview: DraftPreview) {
  const client = useQueryClient()
  const [initial] = useState(() => initialSession(eventId, preview))
  const [session, setSession] = useState(initial)

  useEffect(() => writeStored(eventId, session), [eventId, session])

  // Warn before closing the tab with picks not saved yet (FR-008).
  useEffect(() => {
    if (!hasChanges(session)) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [session])

  const teamOf = (playerId: string) =>
    [...preview.players, ...preview.members].find((player) => player.id === playerId)?.team_id ??
    null

  const save = useMutation({
    mutationFn: () => saveDraft({ eventId, assignments: draftAssignments(session, teamOf) }),
    onSuccess: async () => {
      setSession(newSession(session.order))
      await Promise.all([
        client.invalidateQueries({ queryKey: ['teams', eventId] }),
        client.invalidateQueries({ queryKey: ['players', eventId] }),
      ])
    },
  })

  const discard = () => setSession(newSession(session.order))

  return { session, setSession, restored: hasChanges(initial), save, discard }
}
