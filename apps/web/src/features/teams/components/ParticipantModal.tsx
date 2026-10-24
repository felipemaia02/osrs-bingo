import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { useSession } from '../../auth/hooks/useSession'
import { useStatFormat } from '../../profiles/hooks/useStatFormat'
import { useAccountsLine } from '../rosterFormat'
import { teamErrorKey } from '../errors'
import { useAdministrators, useTeamMutations } from '../hooks/useTeams'
import {
  BUY_IN_STATUSES,
  PARTICIPANT_ROLES,
  type BuyInStatus,
  type ParticipantRole,
  type Player,
} from '../types'

/** Role and buy-in of one participant (feature 023, FR-004; no mockup, design system). */
export function ParticipantModal({
  eventId,
  player,
  onSaved,
  onClose,
}: {
  eventId: string
  player: Player
  onSaved: (message: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const session = useSession()
  const format = useStatFormat()
  const accountsLine = useAccountsLine()
  const admins = useAdministrators(true)
  const { updateParticipation } = useTeamMutations()
  const [role, setRole] = useState<ParticipantRole | ''>(player.role ?? '')
  const [status, setStatus] = useState<BuyInStatus>(player.buy_in_status ?? 'pending')
  const [receivedBy, setReceivedBy] = useState<string>('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  // Paid defaults to the admin making the change (they usually received it).
  const receiver =
    receivedBy ||
    admins.data?.find((admin) => admin.username === player.buy_in_admin_name)?.id ||
    session.data?.id ||
    ''
  const busy = updateParticipation.isPending

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setErrorKey(null)
    updateParticipation.mutate(
      {
        eventId,
        playerId: player.id,
        payload: {
          role: role || null,
          buy_in_status: status,
          buy_in_admin_id: status === 'paid' ? receiver : null,
        },
      },
      {
        onSuccess: () => onSaved(t('teams.participant.saved', { name: player.display_name })),
        onError: (error) => setErrorKey(teamErrorKey(error)),
      },
    )
  }

  return (
    <FormModal
      title={t('teams.participant.title', { name: player.display_name })}
      busy={busy}
      size="sm"
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2.5 text-[13px]">
          <strong className="text-sm text-rs-gold-bright">{player.display_name}</strong>
          <br />
          <span className="text-rs-muted">{accountsLine(player)}</span>
          {player.ehb_total !== null && player.ehb_total !== undefined && (
            <>
              <br />
              {t('teams.roster.experienceLine', {
                ehb: format.hours(player.ehb_total),
                kc: format.whole(player.boss_kc_total ?? null),
              })}
            </>
          )}
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('teams.roster.role')}
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as ParticipantRole | '')}
            className={`${FIELD_CLASS} font-normal`}
          >
            <option value="">{t('teams.roles.none')}</option>
            {PARTICIPANT_ROLES.map((option) => (
              <option key={option} value={option}>
                {t(`teams.roles.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('teams.roster.buyIn')}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as BuyInStatus)}
            className={`${FIELD_CLASS} font-normal`}
          >
            {BUY_IN_STATUSES.map((option) => (
              <option key={option} value={option}>
                {t(`teams.buyIn.${option}`)}
              </option>
            ))}
          </select>
        </label>
        {status === 'paid' && (
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            {t('teams.participant.receivedBy')}
            <select
              value={receiver}
              disabled={admins.isLoading}
              onChange={(event) => setReceivedBy(event.target.value)}
              className={`${FIELD_CLASS} font-normal`}
            >
              {(admins.data ?? []).map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.username}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="m-0 text-xs text-rs-muted">{t('teams.participant.captainHint')}</p>
        {errorKey && (
          <p role="alert" className="m-0 text-sm text-rs-danger-text">
            {t(errorKey)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || (status === 'paid' && !receiver)}
          >
            {t(busy ? 'common.saving' : 'common.save')}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
