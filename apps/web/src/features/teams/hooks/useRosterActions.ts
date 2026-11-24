import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { teamErrorKey } from '../errors'
import type { Player, SelectionResult } from '../types'
import { useTeamMutations } from './useTeams'

export interface RosterFeedback {
  message: string
  /** Errors are announced as alerts and kept inside open dialogs. */
  isError: boolean
}

/** Roster mutations with the success/error message each one produces. */
export function useRosterActions(eventId: string) {
  const { t } = useTranslation()
  const mutations = useTeamMutations()
  const [feedback, setFeedback] = useState<RosterFeedback | null>(null)
  const saving =
    mutations.approvePlayer.isPending ||
    mutations.approveAllPlayers.isPending ||
    mutations.removePlayer.isPending ||
    mutations.approveSelectedPlayers.isPending ||
    mutations.removeSelectedPlayers.isPending

  async function run(action: () => Promise<string>): Promise<boolean> {
    setFeedback(null)
    try {
      setFeedback({ message: await action(), isError: false })
      return true
    } catch (error) {
      setFeedback({ message: t(teamErrorKey(error)), isError: true })
      return false
    }
  }

  const selectionMessage = (key: string, result: SelectionResult) =>
    [
      t(key, { count: result.changed }),
      result.skipped ? t('teams.feedback.skipped', { count: result.skipped }) : '',
    ]
      .filter(Boolean)
      .join(' ')

  return {
    feedback,
    clearFeedback: () => setFeedback(null),
    /** Success message for actions handled by their own dialogs (assign team, create team). */
    notify: (message: string) => setFeedback({ message, isError: false }),
    saving,
    approve: (player: Player) =>
      run(async () => {
        await mutations.approvePlayer.mutateAsync({ eventId, playerId: player.id })
        return t('teams.feedback.approved')
      }),
    approveAll: () =>
      run(async () => {
        await mutations.approveAllPlayers.mutateAsync({ eventId })
        return t('teams.feedback.approved')
      }),
    remove: (player: Player) =>
      run(async () => {
        await mutations.removePlayer.mutateAsync({ eventId, playerId: player.id })
        return t('teams.feedback.removed')
      }),
    approveSelected: (playerIds: string[]) =>
      run(async () =>
        selectionMessage(
          'teams.feedback.selectedApproved',
          await mutations.approveSelectedPlayers.mutateAsync({ eventId, playerIds }),
        ),
      ),
    removeSelected: (playerIds: string[]) =>
      run(async () =>
        selectionMessage(
          'teams.feedback.selectedRemoved',
          await mutations.removeSelectedPlayers.mutateAsync({ eventId, playerIds }),
        ),
      ),
  }
}
