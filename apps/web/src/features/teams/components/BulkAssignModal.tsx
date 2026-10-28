import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import type { Player, Team, TeamBalance } from '../types'
import { TeamEmblem } from './TeamEmblem'

/** Assign the selected players to one team at once (feature 038). */
export function BulkAssignModal({
  players,
  teams,
  balance,
  busy,
  onConfirm,
  onClose,
}: {
  players: Player[]
  teams: Team[]
  balance: TeamBalance[]
  busy: boolean
  onConfirm: (teamId: string) => Promise<boolean>
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const format = useStatFormat()
  const [teamId, setTeamId] = useState('')
  const stats = new Map(balance.map((team) => [team.team_id, team]))
  const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' })
  const losingCaptain = players.filter(
    (player) => teamId && player.role === 'captain' && player.team_id !== teamId,
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (teamId && (await onConfirm(teamId))) onClose()
  }

  return (
    <FormModal
      title={t('teams.bulk.assignTitle', { count: players.length })}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
        <p className="m-0 text-[13px] text-rs-muted">
          {names.format(players.map((player) => player.display_name))}
        </p>
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1.5 p-0 text-[13px] font-semibold">{t('teams.selectTeam')}</legend>
          {teams.map((team) => {
            const info = stats.get(team.id)
            return (
              <label
                key={team.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-[3px] border px-3 py-2 text-sm ${
                  teamId === team.id
                    ? 'border-rs-gold bg-rs-raised'
                    : 'border-rs-border/60 bg-rs-inset'
                }`}
              >
                <input
                  type="radio"
                  name="team"
                  value={team.id}
                  checked={teamId === team.id}
                  onChange={() => setTeamId(team.id)}
                  className="accent-rs-gold"
                />
                <TeamEmblem team={team} size="sm" />
                <span className="flex-1 font-semibold">{team.name}</span>
                <span className="text-xs text-rs-muted">
                  {t('teams.balance.players', { count: info?.player_count ?? team.member_count })}
                  {info && ` · ${t('teams.balance.ehb')} ${format.hours(info.ehb_total)}`}
                </span>
              </label>
            )
          })}
        </fieldset>
        {losingCaptain.length > 0 && (
          <p className="m-0 rounded-[3px] border border-rs-border-strong bg-rs-warning-bg px-3 py-2 text-[13px]">
            {t('teams.bulk.captainsLoseRole', {
              names: names.format(losingCaptain.map((player) => player.display_name)),
            })}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !teamId}>
            {t('teams.bulk.assignConfirm', { count: players.length })}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
