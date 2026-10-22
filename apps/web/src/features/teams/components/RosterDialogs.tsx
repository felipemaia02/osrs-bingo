import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { teamErrorKey } from '../errors'
import type { RosterFeedback } from '../hooks/useRosterActions'
import { useTeamMutations } from '../hooks/useTeams'
import type { Player, Team } from '../types'

interface ConfirmDialogProps {
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  busy: boolean
  error: RosterFeedback | null
  onConfirm: () => void
  onClose: () => void
}

/** Small confirmation modal; API errors stay inside it. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  busy,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  return (
    <FormModal title={title} busy={busy} size="sm" onClose={onClose}>
      <p className="m-0">{message}</p>
      {error?.isError && (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-rs-danger/60 bg-rs-inset p-3 text-sm"
        >
          {error.message}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
          {busy ? t('common.saving') : confirmLabel}
        </Button>
      </div>
    </FormModal>
  )
}

/** Assign or change the team of an approved registration. */
export function PlayerAssignment({
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
  const [teamId, setTeamId] = useState(player.team_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const { updatePlayer } = useTeamMutations()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await updatePlayer.mutateAsync({
        eventId,
        playerId: player.id,
        payload: { team_id: teamId || null },
      })
      onSaved()
    } catch (failure) {
      setError(t(teamErrorKey(failure)))
    }
  }

  return (
    <FormModal
      title={t('teams.roster.assignPlayer', { name: player.display_name })}
      busy={updatePlayer.isPending}
      size="sm"
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('teams.assignmentFor', { name: player.display_name })}
          <select
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            disabled={updatePlayer.isPending}
            className="min-h-11 rounded-[3px] border border-rs-border bg-rs-inset px-3 text-base font-normal text-rs-text md:min-h-10 md:text-sm"
          >
            <option value="">{t('teams.unassigned')}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-inset p-3 text-sm"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={updatePlayer.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updatePlayer.isPending || teamId === (player.team_id ?? '')}
          >
            {t(updatePlayer.isPending ? 'common.saving' : 'teams.saveAssignment')}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
