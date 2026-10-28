import { useState, type FormEvent } from 'react'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { FormModal } from '../../../components/ui/FormModal'
import type { CardSummary } from '../../cards/types'
import { useUpdateBoardPosition } from '../hooks/useBoards'
import type { BoardCardSnapshot, BoardPosition, EventBoard } from '../types'
import { usePositionLabel } from '../hooks/usePositionLabel'

const REASON_MAX_LENGTH = 500

interface Pending {
  position: BoardPosition
  card: CardSummary
}

/**
 * Live card fixes (feature 036): squares whose card has a newer catalog revision can be
 * updated during the event, with a reason players see. Also lists the changes already made.
 */
export function LiveCardFixes({
  eventId,
  board,
  cards,
  onDone,
}: {
  eventId: string
  board: EventBoard
  cards: CardSummary[]
  onDone: (message: string) => void
}) {
  const { t, i18n } = useTranslation()
  const label = usePositionLabel(board.size)
  const [open, setOpen] = useState<Pending | null>(null)
  const byId = new Map(cards.map((card) => [card.id, card]))
  const available = board.positions.flatMap((position) => {
    const card = byId.get(position.card.card_id)
    return card && card.status === 'active' && card.current_revision > position.card.card_revision
      ? [{ position, card }]
      : []
  })
  const history = board.positions.flatMap((position) =>
    (position.updates ?? []).map((update) => ({ position, update })),
  )
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <section
      aria-label={t('boards.live.title')}
      className="flex flex-col gap-2 rounded border border-rs-border bg-rs-surface p-3"
    >
      <h2 className="m-0 flex items-center gap-2 text-sm font-semibold text-rs-gold-bright">
        <BuildOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        {t('boards.live.title')}
      </h2>
      <p className="m-0 text-xs text-rs-muted">{t('boards.live.hint')}</p>
      {available.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {available.map(({ position, card }) => (
            <li
              key={position.position}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-rs-border-strong bg-rs-warning-bg px-2.5 py-1.5 text-[13px]"
            >
              <span>
                <strong>{position.card.name}</strong>{' '}
                <span className="text-rs-muted">
                  · {label(position.position)} ·{' '}
                  {t('boards.live.revisions', {
                    from: position.card.card_revision,
                    to: card.current_revision,
                  })}
                </span>
              </span>
              <Button size="sm" onClick={() => setOpen({ position, card })}>
                {t('boards.live.review')}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-xs text-rs-muted">{t('boards.live.none')}</p>
      )}
      {history.length > 0 && (
        <details className="text-[13px]">
          <summary className="cursor-pointer text-rs-gold-bright">
            {t('boards.live.history', { count: history.length })}
          </summary>
          <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
            {history.map(({ position, update }) => (
              <li key={`${position.position}-${update.updated_at}`} className="text-xs">
                <strong>{position.card.name}</strong> ·{' '}
                {t('boards.live.revisions', { from: update.from_revision, to: update.to_revision })}{' '}
                · {update.updated_by_name} · {date.format(new Date(update.updated_at))} — “
                {update.reason}”
              </li>
            ))}
          </ul>
        </details>
      )}
      {open && (
        <UpdateCardModal
          eventId={eventId}
          pending={open}
          onClose={() => setOpen(null)}
          onDone={(message) => {
            setOpen(null)
            onDone(message)
          }}
        />
      )}
    </section>
  )
}

type Row = { label: string; before: string; after: string }

function comparison(
  before: BoardCardSnapshot,
  after: CardSummary['revision'],
  t: (key: string) => string,
): Row[] {
  const drops = (card: { drops: BoardCardSnapshot['drops'] }) =>
    card.drops.map((drop) => `${drop.name} (+${drop.progress_weight})`).join(', ')
  return [
    { label: t('cards.form.name'), before: before.name, after: after.name },
    {
      label: t('cards.form.score'),
      before: String(before.tile_score),
      after: String(after.tile_score),
    },
    {
      label: t('cards.form.requirement'),
      before: String(before.completion_requirement),
      after: String(after.completion_requirement),
    },
    {
      label: t('cards.form.difficulty'),
      before: t(`tile.tier.${before.difficulty}`),
      after: t(`tile.tier.${after.difficulty}`),
    },
    { label: t('cards.drops.title'), before: drops(before), after: drops(after) },
    {
      label: t('cards.form.description'),
      before: before.description ?? '—',
      after: after.description ?? '—',
    },
  ]
}

function UpdateCardModal({
  eventId,
  pending,
  onClose,
  onDone,
}: {
  eventId: string
  pending: Pending
  onClose: () => void
  onDone: (message: string) => void
}) {
  const { t } = useTranslation()
  const update = useUpdateBoardPosition()
  const [reason, setReason] = useState('')
  const [error, setError] = useState(false)
  const rows = comparison(pending.position.card, pending.card.revision, t)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(false)
    try {
      await update.mutateAsync({
        eventId,
        position: pending.position.position,
        cardRevision: pending.card.current_revision,
        reason: reason.trim(),
      })
      onDone(t('boards.live.done', { name: pending.card.revision.name }))
    } catch {
      setError(true)
    }
  }

  return (
    <FormModal
      title={t('boards.live.modalTitle', { name: pending.position.card.name })}
      busy={update.isPending}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="text-xs text-rs-muted">
              <th className="py-1 pr-2 font-semibold" />
              <th className="py-1 pr-2 font-semibold">
                {t('boards.live.onBoard', { revision: pending.position.card.card_revision })}
              </th>
              <th className="py-1 font-semibold">
                {t('boards.live.newRevision', { revision: pending.card.current_revision })}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const changed = row.before !== row.after
              return (
                <tr
                  key={row.label}
                  className={`border-t border-rs-border/40 align-top ${changed ? 'bg-rs-warning-bg' : ''}`}
                >
                  <th scope="row" className="py-1.5 pr-2 font-semibold">
                    {row.label}
                    {changed && <span className="sr-only"> ({t('boards.live.changed')})</span>}
                  </th>
                  <td className="py-1.5 pr-2 text-rs-muted">{row.before}</td>
                  <td className={`py-1.5 ${changed ? 'font-semibold text-rs-gold-bright' : ''}`}>
                    {row.after}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="m-0 text-xs text-rs-muted">{t('boards.live.effect')}</p>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('boards.live.reason')}
          <textarea
            required
            rows={3}
            maxLength={REASON_MAX_LENGTH}
            value={reason}
            onChange={(change) => setReason(change.target.value)}
            placeholder={t('boards.live.reasonPlaceholder')}
            className={`${FIELD_CLASS} resize-y py-2 font-normal`}
          />
        </label>
        {error && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
          >
            {t('common.apiError')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={update.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={update.isPending || !reason.trim()}>
            {t(update.isPending ? 'common.saving' : 'boards.live.confirm')}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
