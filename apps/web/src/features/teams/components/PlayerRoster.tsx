import { useState, type FormEvent } from 'react'
import Dialog from '@mui/material/Dialog'
import { useTranslation } from 'react-i18next'
import { teamErrorKey } from '../errors'
import { useTeamMutations } from '../hooks/useTeams'
import type { Player, Team } from '../types'

interface PlayerRosterProps {
  eventId: string
  players: Player[]
  teams: Team[]
  editable: boolean
}

export function PlayerRoster({ eventId, players, teams, editable }: PlayerRosterProps) {
  const { t } = useTranslation()
  const [removing, setRemoving] = useState<Player | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const { approvePlayer, approveAllPlayers, removePlayer } = useTeamMutations()
  const pending = players.filter((player) => player.status === 'pending')
  const approved = players.filter((player) => player.status === 'approved')
  const saving = approvePlayer.isPending || approveAllPlayers.isPending || removePlayer.isPending

  async function approve(playerId?: string) {
    setFeedback(null)
    try {
      if (playerId) await approvePlayer.mutateAsync({ eventId, playerId })
      else await approveAllPlayers.mutateAsync({ eventId })
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
      setRemoving(null)
    }
  }

  return (
    <div className="mt-4 space-y-5">
      {feedback && (
        <p role="status" className="text-sm text-rs-muted">
          {t(feedback)}
        </p>
      )}
      <section aria-label={t('teams.pending')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-rs-gold">{t('teams.pending')}</h3>
          {editable && pending.length > 0 && (
            <button
              disabled={saving}
              onClick={() => void approve()}
              className="rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-text disabled:opacity-50"
            >
              {t('teams.approveAll')}
            </button>
          )}
        </div>
        {!pending.length && <p className="mt-2 text-sm text-rs-muted">{t('teams.noPending')}</p>}
        <ul className="mt-3 space-y-2">
          {pending.map((player) => (
            <li key={player.id} className="rounded-sm border border-rs-border/50 p-3">
              <p className="text-rs-text">{player.display_name}</p>
              {editable && (
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={saving}
                    onClick={() => void approve(player.id)}
                    aria-label={t('teams.approvePlayer', { name: player.display_name })}
                    className="rounded-sm bg-rs-gold px-3 py-2 text-sm text-rs-inset disabled:opacity-50"
                  >
                    {t('teams.approve')}
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => setRemoving(player)}
                    aria-label={t('teams.removePlayer', { name: player.display_name })}
                    className="rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-muted disabled:opacity-50"
                  >
                    {t('teams.remove')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section aria-label={t('teams.approved')}>
        <h3 className="font-medium text-rs-gold">{t('teams.approved')}</h3>
        {!approved.length && <p className="mt-2 text-sm text-rs-muted">{t('teams.noPlayers')}</p>}
        <ul className="mt-3 space-y-3">
          {approved.map((player) => (
            <li key={player.id} className="rounded-sm border border-rs-border/50 p-3">
              <p className="font-medium text-rs-text">{player.display_name}</p>
              <p className="mt-1 text-sm text-rs-muted">
                {teams.find((team) => team.id === player.team_id)?.name ?? t('teams.unassigned')}
              </p>
              {editable && (
                <>
                  <PlayerAssignment eventId={eventId} player={player} teams={teams} />
                  <button
                    disabled={saving}
                    onClick={() => setRemoving(player)}
                    aria-label={t('teams.removePlayer', { name: player.display_name })}
                    className="mt-2 text-sm text-rs-muted underline disabled:opacity-50"
                  >
                    {t('teams.remove')}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
      <Dialog
        open={Boolean(removing)}
        onClose={() => {
          if (!removePlayer.isPending) setRemoving(null)
        }}
        aria-labelledby="remove-registration-title"
      >
        <div className="border border-rs-border bg-rs-surface p-5 text-rs-text">
          <h3 id="remove-registration-title" className="font-display text-rs-gold">
            {t('teams.removeTitle')}
          </h3>
          <p className="mt-3 text-sm">
            {t('teams.removeConfirmation', { name: removing?.display_name })}
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <button
              disabled={removePlayer.isPending}
              onClick={() => setRemoving(null)}
              className="rounded-sm border border-rs-border px-3 py-2 text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              disabled={removePlayer.isPending}
              onClick={() => void remove()}
              className="rounded-sm bg-rs-gold px-3 py-2 text-sm text-rs-inset"
            >
              {t(removePlayer.isPending ? 'common.saving' : 'teams.confirmRemoval')}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function PlayerAssignment({
  eventId,
  player,
  teams,
}: Omit<PlayerRosterProps, 'players' | 'editable'> & { player: Player }) {
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
      setFeedback('teams.feedback.assignmentUpdated')
    } catch (error) {
      setFeedback(teamErrorKey(error))
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <label className="block text-sm text-rs-muted">
        {t('teams.assignmentFor', { name: player.display_name })}
        <select
          value={teamId}
          onChange={(event) => setSelection({ current: player.team_id, next: event.target.value })}
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
        <p role="status" className="text-sm text-rs-muted">
          {t(feedback)}
        </p>
      )}
    </form>
  )
}
