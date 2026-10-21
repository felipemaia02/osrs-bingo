import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FormModal } from '../../../components/ui/FormModal'
import { teamErrorKey } from '../errors'
import { useTeamMutations } from '../hooks/useTeams'
import type { Player, Team, RosterGroup } from '../types'

interface PlayerRosterProps {
  eventId: string
  players: Player[]
  teams: Team[]
  editable: boolean
  pendingCount: number
  group: RosterGroup
}
const actionClass =
  'rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-gold disabled:opacity-40'

export function PlayerRoster({
  eventId,
  players,
  teams,
  editable,
  pendingCount,
  group,
}: PlayerRosterProps) {
  const { t } = useTranslation()
  const [removing, setRemoving] = useState<Player | null>(null)
  const [assigning, setAssigning] = useState<Player | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const { approvePlayer, approveAllPlayers, removePlayer } = useTeamMutations()
  const saving = approvePlayer.isPending || approveAllPlayers.isPending || removePlayer.isPending

  async function approve(playerId?: string) {
    setFeedback(null)
    try {
      if (playerId) await approvePlayer.mutateAsync({ eventId, playerId })
      else await approveAllPlayers.mutateAsync({ eventId })
      setConfirmAll(false)
      setFeedback('teams.feedback.approved')
    } catch (error) {
      setFeedback(teamErrorKey(error))
    }
  }
  async function remove() {
    if (!removing) return
    setFeedback(null)
    try {
      await removePlayer.mutateAsync({ eventId, playerId: removing.id })
      setRemoving(null)
      setFeedback('teams.feedback.removed')
    } catch (error) {
      setFeedback(teamErrorKey(error))
    }
  }

  return (
    <div className="space-y-4">
      {feedback && !removing && !confirmAll && (
        <p role="status" className="text-sm text-rs-muted">
          {t(feedback)}
        </p>
      )}
      {editable && group === 'pending' && pendingCount > 0 && (
        <button
          className={actionClass}
          disabled={saving}
          onClick={() => {
            setFeedback(null)
            setConfirmAll(true)
          }}
        >
          {t('teams.approveAll')}
        </button>
      )}
      {!players.length ? (
        <p className="text-sm text-rs-muted">
          {t(group === 'pending' ? 'teams.noPending' : 'teams.noPlayers')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-rs-border text-rs-muted">
              <tr>
                <th className="p-3">{t('teams.roster.player')}</th>
                <th className="p-3">{t('teams.roster.status')}</th>
                <th className="p-3">{t('teams.teams')}</th>
                <th className="p-3">{t('teams.roster.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rs-border/40">
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="p-3 font-medium text-rs-text">{player.display_name}</td>
                  <td className="p-3 text-rs-muted">
                    {t(player.status === 'pending' ? 'teams.pending' : 'teams.approved')}
                  </td>
                  <td className="p-3 text-rs-muted">
                    {teams.find((team) => team.id === player.team_id)?.name ??
                      t('teams.unassigned')}
                  </td>
                  <td className="p-3">
                    {editable && (
                      <div className="flex flex-wrap gap-2">
                        {player.status === 'pending' ? (
                          <button
                            className={actionClass}
                            disabled={saving}
                            aria-label={t('teams.approvePlayer', { name: player.display_name })}
                            onClick={() => void approve(player.id)}
                          >
                            {t('teams.approve')}
                          </button>
                        ) : (
                          <button
                            className={actionClass}
                            disabled={saving}
                            aria-label={t('teams.roster.assignPlayer', {
                              name: player.display_name,
                            })}
                            onClick={() => setAssigning(player)}
                          >
                            {t('teams.roster.assign')}
                          </button>
                        )}
                        <button
                          className={actionClass}
                          disabled={saving}
                          aria-label={t('teams.removePlayer', { name: player.display_name })}
                          onClick={() => {
                            setFeedback(null)
                            setRemoving(player)
                          }}
                        >
                          {t('teams.remove')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {assigning && (
        <PlayerAssignment
          key={assigning.id}
          eventId={eventId}
          player={assigning}
          teams={teams}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setAssigning(null)
            setFeedback('teams.feedback.assignmentUpdated')
          }}
        />
      )}
      {removing && (
        <FormModal
          title={t('teams.removeTitle')}
          busy={removePlayer.isPending}
          onClose={() => {
            setRemoving(null)
            setFeedback(null)
          }}
        >
          <p>{t('teams.removeConfirmation', { name: removing.display_name })}</p>
          {feedback && (
            <p role="alert" className="mt-3">
              {t(feedback)}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <button
              className={actionClass}
              disabled={saving}
              onClick={() => {
                setRemoving(null)
                setFeedback(null)
              }}
            >
              {t('common.cancel')}
            </button>
            <button className={actionClass} disabled={saving} onClick={() => void remove()}>
              {t(removePlayer.isPending ? 'common.saving' : 'teams.confirmRemoval')}
            </button>
          </div>
        </FormModal>
      )}
      {confirmAll && (
        <FormModal
          title={t('teams.approveAll')}
          busy={approveAllPlayers.isPending}
          onClose={() => {
            setConfirmAll(false)
            setFeedback(null)
          }}
        >
          <p>{t('teams.roster.confirmAll', { count: pendingCount })}</p>
          {feedback && (
            <p role="alert" className="mt-3">
              {t(feedback)}
            </p>
          )}
          <button
            className={`${actionClass} mt-4`}
            disabled={saving}
            onClick={() => void approve()}
          >
            {t('teams.roster.confirmApprove')}
          </button>
        </FormModal>
      )}
    </div>
  )
}

function PlayerAssignment({
  eventId,
  player,
  teams,
  onSaved,
  onClose,
}: {
  eventId: string
  player: Player
  teams: Team[]
  onSaved: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [selection, setSelection] = useState<{ current: string | null; next: string } | null>(null)
  const teamId = selection?.current === player.team_id ? selection.next : (player.team_id ?? '')
  const [feedback, setFeedback] = useState<string | null>(null)
  const { updatePlayer } = useTeamMutations()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    try {
      await updatePlayer.mutateAsync({
        eventId,
        playerId: player.id,
        payload: { team_id: teamId || null },
      })
      onSaved()
    } catch (error) {
      setFeedback(teamErrorKey(error))
    }
  }

  return (
    <FormModal
      title={t('teams.roster.assignPlayer', { name: player.display_name })}
      busy={updatePlayer.isPending}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-rs-muted">
          {t('teams.assignmentFor', { name: player.display_name })}
          <select
            value={teamId}
            onChange={(event) =>
              setSelection({ current: player.team_id, next: event.target.value })
            }
            disabled={updatePlayer.isPending}
            className="mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
          >
            <option value="">{t('teams.unassigned')}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={updatePlayer.isPending || teamId === (player.team_id ?? '')}
          className="rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-text disabled:opacity-50"
        >
          {t(updatePlayer.isPending ? 'common.saving' : 'teams.saveAssignment')}
        </button>
        {feedback && (
          <p role="alert" className="text-sm text-rs-muted">
            {t(feedback)}
          </p>
        )}
      </form>
    </FormModal>
  )
}
