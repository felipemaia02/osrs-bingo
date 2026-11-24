import { useMemo, useState } from 'react'
import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined'
import ArrowForwardIosOutlinedIcon from '@mui/icons-material/ArrowForwardIosOutlined'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { teamErrorKey } from '../../teams/errors'
import type { BingoEvent } from '../../events/types'
import { useDraftPreview } from '../../teams/hooks/useTeams'
import type { DraftPreview, Player } from '../../teams/types'
import { draftColumns, draftPool } from '../board'
import { useDraftSession } from '../hooks/useDraftSession'
import {
  canReorder,
  draftPlayer,
  hasChanges,
  moveInOrder,
  onTheClock,
  removeMember,
  roundAndPick,
  shiftTeam,
  undo,
} from '../session'
import { DraftPlayerModal } from './DraftPlayerModal'
import { DraftPool } from './DraftPool'
import { DraftTeamColumn } from './DraftTeamColumn'

type MobileView = 'pool' | 'teams'

/** Participant actions that used to live in the Unassigned/Assigned tabs (076 revision 1). */
export interface DraftParticipantActions {
  onEdit: (player: Player) => void
  onRemove: (player: Player) => void
}

/** The Draft tab of Teams (feature 076): snake order, picks kept in the browser until
 * "Save teams". Shown in place, not full screen (revision 1). */
export function DraftBoard({
  event,
  actions,
}: {
  event: BingoEvent
  actions: DraftParticipantActions
}) {
  const { t } = useTranslation()
  const preview = useDraftPreview(event.id)
  if (preview.isLoading)
    return (
      <p role="status" className="m-0 p-3 text-rs-muted">
        {t('common.loading')}
      </p>
    )
  if (preview.isError || !preview.data)
    return (
      <p role="alert" className="m-0 p-3">
        {t('common.apiError')}
      </p>
    )
  if (!preview.data.captains.length)
    return (
      <div className="p-3">
        <InfoBanner>{t('draft.board.noTeams')}</InfoBanner>
      </div>
    )
  return <DraftBoardContent event={event} preview={preview.data} actions={actions} />
}

function DraftBoardContent({
  event,
  preview,
  actions,
}: {
  event: BingoEvent
  preview: DraftPreview
  actions: DraftParticipantActions
}) {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const { session, setSession, restored, save, discard } = useDraftSession(event.id, preview)
  // Drafts allow every change; during the event only players without a team move (037).
  const editable = event.status === 'draft' || event.status === 'active'
  const live = event.status === 'active'
  const [view, setView] = useState<MobileView>('pool')
  const [openPlayer, setOpenPlayer] = useState<Player | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const columns = useMemo(() => draftColumns(preview, session), [preview, session])
  const pool = useMemo(() => draftPool(preview, session), [preview, session])
  const clock = onTheClock(session)
  const clockTeam = preview.captains.find((team) => team.team_id === clock) ?? null
  const { round, pick } = roundAndPick(session)
  const changed = hasChanges(session)
  const names = new Map(
    [...preview.players, ...preview.members].map((player) => [player.id, player.display_name]),
  )

  const header = editable && (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rs-border/60 p-3">
      <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm uppercase tracking-[.12em] text-rs-muted">
        <span>
          {t('draft.board.round')} <strong className="text-rs-gold-bright">{round}</strong>
          {' · '}
          {t('draft.board.pick')} <strong className="text-rs-gold-bright">{pick}</strong>
        </span>
        <span className="flex items-center gap-2" role="status">
          {t('draft.board.onTheClock')}
          {clockTeam && (
            <strong className="inline-flex items-center gap-2 rounded-[3px] border border-rs-gold px-2.5 py-1 normal-case tracking-normal text-rs-gold-bright">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ backgroundColor: clockTeam.color ?? undefined }}
              />
              {clockTeam.team_name}
            </strong>
          )}
        </span>
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          disabled={!session.history.length || save.isPending}
          onClick={() => setSession(undo(session))}
        >
          <UndoOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {t('draft.board.undo')}
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!changed || save.isPending}
          onClick={() => save.mutate()}
        >
          <CheckOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          {t(save.isPending ? 'common.saving' : 'draft.board.save')}
        </Button>
      </div>
    </div>
  )

  const orderStrip = editable && (
    <div className="flex flex-wrap items-center gap-2 border-b border-rs-border/60 px-3 py-2">
      <span className="text-xs uppercase tracking-[.12em] text-rs-muted">
        {t('draft.board.order')}
      </span>
      <ol aria-label={t('draft.board.order')} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {session.order.map((teamId, index) => {
          const team = preview.captains.find((item) => item.team_id === teamId)
          if (!team) return null
          return (
            <li
              key={teamId}
              className={`flex items-center gap-1 rounded-[3px] border px-2 py-1 text-xs font-semibold uppercase tracking-[.08em] ${
                teamId === clock ? 'border-rs-gold text-rs-gold-bright' : 'border-rs-border'
              }`}
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full border border-rs-border-strong"
                style={{ backgroundColor: team.color ?? undefined }}
              />
              {team.team_name}
              {canReorder(session) && (
                <>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => setSession(moveInOrder(session, teamId, -1))}
                    aria-label={t('draft.board.moveEarlier', { name: team.team_name })}
                    className="ml-1 inline-flex size-6 items-center justify-center rounded-[2px] hover:bg-rs-raised disabled:opacity-40"
                  >
                    <ArrowBackIosNewOutlinedIcon sx={{ fontSize: 12 }} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={index === session.order.length - 1}
                    onClick={() => setSession(moveInOrder(session, teamId, 1))}
                    aria-label={t('draft.board.moveLater', { name: team.team_name })}
                    className="inline-flex size-6 items-center justify-center rounded-[2px] hover:bg-rs-raised disabled:opacity-40"
                  >
                    <ArrowForwardIosOutlinedIcon sx={{ fontSize: 12 }} aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ol>
      <div className="ml-auto flex gap-2">
        <Button size="sm" onClick={() => setSession(shiftTeam(session, -1))}>
          <ArrowBackIosNewOutlinedIcon sx={{ fontSize: 12 }} aria-hidden="true" />
          {t('draft.board.prevTeam')}
        </Button>
        <Button size="sm" onClick={() => setSession(shiftTeam(session, 1))}>
          {t('draft.board.nextTeam')}
          <ArrowForwardIosOutlinedIcon sx={{ fontSize: 12 }} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )

  const notices = (
    <div className="flex flex-col gap-2 px-3 pt-3 empty:hidden">
      {live && <p className="m-0 text-xs text-rs-muted">{t('draft.board.liveHint')}</p>}
      {restored && changed && (
        <div className="flex flex-wrap items-center gap-2">
          <InfoBanner>{t('draft.board.restored')}</InfoBanner>
          <Button size="sm" variant="danger" onClick={() => setConfirmDiscard(true)}>
            {t('draft.board.discard')}
          </Button>
        </div>
      )}
      {save.isSuccess && (
        <p role="status" className="m-0 text-sm text-rs-success-text">
          {t('draft.board.saved', { count: save.data.changed })}
        </p>
      )}
      {save.isSuccess && save.data.skipped.length > 0 && (
        <p role="alert" className="m-0 text-sm text-rs-danger-text">
          {t('draft.board.skipped', {
            names: save.data.skipped.map((id) => names.get(id) ?? id).join(', '),
          })}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="m-0 text-sm text-rs-danger-text">
          {t(teamErrorKey(save.error))}
        </p>
      )}
    </div>
  )

  // Members from before this session are locked during the event (037).
  const canReturn = (playerId: string) =>
    editable && (!live || session.picks.some((item) => item.playerId === playerId))

  const poolPanel = (
    <div className="flex flex-col p-3 lg:max-h-[75vh] lg:w-[360px] lg:shrink-0 lg:border-r lg:border-rs-border/60">
      <DraftPool
        players={pool}
        onDraft={editable && clock ? (player) => setSession(draftPlayer(session, player.id)) : null}
        onOpen={setOpenPlayer}
        actions={editable ? actions : null}
      />
    </div>
  )
  const teamsPanel = (
    <div className="min-w-0 flex-1 overflow-x-auto p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        {columns.map((column) => (
          <DraftTeamColumn
            key={column.team.team_id}
            column={column}
            onClock={editable && column.team.team_id === clock}
            canReturn={canReturn}
            onReturn={(playerId) => setSession(removeMember(session, playerId))}
            onEdit={editable ? actions.onEdit : null}
          />
        ))}
      </div>
    </div>
  )

  return (
    <section aria-label={t('draft.board.title')} className="flex flex-col">
      {header}
      {orderStrip}
      {notices}
      {isDesktop ? (
        <div className="flex min-h-0">
          {poolPanel}
          {teamsPanel}
        </div>
      ) : (
        <>
          <div role="tablist" aria-label={t('draft.board.views')} className="flex gap-2 px-3 pt-3">
            {(['pool', 'teams'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => setView(value)}
                className={`min-h-11 flex-1 rounded-[3px] border text-sm font-semibold ${
                  view === value
                    ? 'border-rs-gold bg-rs-raised text-rs-gold-bright'
                    : 'border-rs-border bg-rs-surface'
                }`}
              >
                {t(`draft.board.view.${value}`)}
              </button>
            ))}
          </div>
          {view === 'pool' ? poolPanel : teamsPanel}
        </>
      )}
      {openPlayer && <DraftPlayerModal player={openPlayer} onClose={() => setOpenPlayer(null)} />}
      {confirmDiscard && (
        <ConfirmDialog
          title={t('draft.board.discardTitle')}
          message={t('draft.board.discardMessage')}
          confirmLabel={t('draft.board.discard')}
          danger
          busy={false}
          onConfirm={() => {
            discard()
            setConfirmDiscard(false)
          }}
          onClose={() => setConfirmDiscard(false)}
        />
      )}
    </section>
  )
}
