import { cardImageUrl } from '../../cards/artwork'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { CardImage } from '../../../components/ui/CardImage'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { FormModal } from '../../../components/ui/FormModal'
import { normalizeSearch } from '../../../lib/text/search'
import type { BoardPosition } from '../../boards/types'
import { submissionErrorKey } from '../errors'
import { useSubmit } from '../hooks/useSubmissions'
import { canSendDrops } from '../preverification'
import type { SubmissionStatus } from '../types'

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const NOTE_MAX_LENGTH = 280

const GATE_TONE: Record<SubmissionStatus | 'required', BadgeTone> = {
  required: 'info',
  pending: 'gold',
  accepted: 'success',
  rejected: 'danger',
}

interface SubmitModalProps {
  eventId: string
  positions: BoardPosition[]
  preverification: Map<number, SubmissionStatus>
  onSent: (messageKey: string) => void
  onClose: () => void
}

/** One item (or one pre-verification) with one screenshot per submission (feature 008). */
export function SubmitModal({
  eventId,
  positions,
  preverification,
  onSent,
  onClose,
}: SubmitModalProps) {
  const { t } = useTranslation()
  const submit = useSubmit()
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState<number | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

  const slot = positions.find((item) => item.position === position) ?? null
  const requires = Boolean(slot?.card.requires_preverification)
  const gate = slot ? preverification.get(slot.position) : undefined
  const sendsPreverification = slot !== null && !canSendDrops(requires, gate)
  const cards = positions.filter((item) =>
    normalizeSearch(item.card.name).includes(normalizeSearch(query)),
  )

  function choose(next: number) {
    setPosition(next)
    setDropKey(null)
    setErrorKey(null)
  }

  function pickFile(next: File | null) {
    setErrorKey(null)
    if (next && !ACCEPTED_TYPES.includes(next.type))
      return setErrorKey('submissions.errors.imageType')
    if (next && next.size > MAX_SCREENSHOT_BYTES) return setErrorKey('submissions.errors.imageSize')
    setFile(next)
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)
    if (!slot) return setErrorKey('submissions.errors.cardRequired')
    if (!sendsPreverification && !dropKey) return setErrorKey('submissions.errors.dropRequired')
    if (!file) return setErrorKey('submissions.errors.screenshotRequired')
    try {
      await submit.mutateAsync({
        eventId,
        payload: {
          kind: sendsPreverification ? 'preverification' : 'drop',
          position: slot.position,
          dropKey: sendsPreverification ? null : dropKey,
          note,
          screenshot: file,
        },
      })
      onSent(
        sendsPreverification
          ? 'submissions.feedback.preverificationSent'
          : 'submissions.feedback.sent',
      )
    } catch (error) {
      setErrorKey(submissionErrorKey(error))
    }
  }

  const gateLabel = (item: BoardPosition) => {
    if (!item.card.requires_preverification) return null
    const state = preverification.get(item.position) ?? 'required'
    return <Badge tone={GATE_TONE[state]}>{t(`submissions.gate.${state}`)}</Badge>
  }

  return (
    <FormModal title={t('submissions.submitTitle')} busy={submit.isPending} onClose={onClose}>
      <form onSubmit={(event) => void send(event)} className="flex flex-col gap-4">
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[13px] font-semibold">{t('submissions.form.card')}</legend>
          <label className="relative flex items-center">
            <SearchOutlinedIcon
              fontSize="small"
              className="pointer-events-none absolute left-2.5 text-rs-muted"
              aria-hidden="true"
            />
            <span className="sr-only">{t('submissions.form.searchCard')}</span>
            <input
              type="search"
              value={query}
              onChange={(change) => setQuery(change.target.value)}
              placeholder={t('submissions.form.searchCard')}
              className={`${FIELD_CLASS} pl-[38px]`}
            />
          </label>
          <div
            role="radiogroup"
            aria-label={t('submissions.form.card')}
            className="flex max-h-60 flex-col overflow-y-auto rounded-[3px] border border-rs-border"
          >
            {cards.map((item) => {
              const selected = item.position === position
              return (
                <button
                  key={item.position}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choose(item.position)}
                  className={`flex min-h-12 items-center gap-3 border-b border-rs-border/45 px-3 py-1.5 text-left last:border-b-0 ${
                    selected
                      ? 'bg-rs-raised shadow-[inset_3px_0_0_theme(colors.rs.gold-bright)]'
                      : 'bg-rs-inset'
                  }`}
                >
                  <CardImage
                    name={item.card.name}
                    imageUrl={cardImageUrl(item.card)}
                    className="h-9 w-10 shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{item.card.name}</span>
                    <span className="text-xs text-rs-muted">
                      {item.bonus
                        ? `★ ${t('board.bonus.card')}`
                        : t('submissions.form.positionLabel', {
                            row: item.row,
                            column: item.column,
                          })}
                    </span>
                  </span>
                  {gateLabel(item)}
                </button>
              )
            })}
            {!cards.length && (
              <p className="m-0 p-4 text-center text-sm text-rs-muted">
                {t('submissions.form.noCards')}
              </p>
            )}
          </div>
        </fieldset>

        {slot && sendsPreverification && (
          <p className="m-0 flex gap-2.5 rounded border border-rs-info bg-rs-info-bg px-3.5 py-2.5 text-[13px] text-rs-info-banner-text">
            <InfoOutlinedIcon fontSize="small" aria-hidden="true" />
            <span className="flex flex-col gap-1">
              <strong>
                {t(
                  gate === 'rejected'
                    ? 'submissions.form.preverificationRejected'
                    : 'submissions.form.preverificationNeeded',
                  { card: slot.card.name },
                )}
              </strong>
              {/* The card's own instructions; older cards fall back to the generic text. */}
              <span className="whitespace-pre-line">
                {slot.card.rule_note ??
                  t('submissions.form.preverificationFirst', { card: slot.card.name })}
              </span>
            </span>
          </p>
        )}
        {slot && !sendsPreverification && (
          <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
            <legend className="mb-2 text-[13px] font-semibold">
              {t('submissions.form.item', { card: slot.card.name })}
            </legend>
            {requires && gate === 'pending' && (
              <p className="m-0 mb-1 text-xs text-rs-muted">{t('submissions.form.gatePending')}</p>
            )}
            {slot.card.drops.map((drop) => (
              <label
                key={drop.key}
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[3px] border px-3 ${
                  dropKey === drop.key
                    ? 'border-rs-gold-bright bg-rs-raised'
                    : 'border-rs-border bg-rs-inset'
                }`}
              >
                <input
                  type="radio"
                  name="drop"
                  value={drop.key}
                  checked={dropKey === drop.key}
                  onChange={() => setDropKey(drop.key)}
                  className="accent-rs-gold"
                />
                <span className="flex-1">{drop.name}</span>
                <span className="text-[13px] font-semibold text-rs-gold-bright">
                  {t('cards.rules.progress', { count: drop.progress_weight })}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">{t('submissions.form.screenshot')}</span>
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[3px] border border-dashed border-rs-border-strong bg-rs-inset px-3 py-2 text-sm">
            <AddPhotoAlternateOutlinedIcon fontSize="small" aria-hidden="true" />
            {file ? file.name : t('submissions.form.chooseScreenshot')}
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              onChange={(change) => pickFile(change.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
          <span className="text-xs text-rs-muted">{t('submissions.form.screenshotHint')}</span>
          {preview && (
            <img
              src={preview}
              alt={t('submissions.form.preview')}
              className="max-h-48 w-full rounded-[3px] border border-rs-border bg-rs-inset object-contain"
            />
          )}
        </div>

        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('submissions.form.note')}
          <textarea
            rows={2}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(change) => setNote(change.target.value)}
            className={`${FIELD_CLASS} resize-y py-2 font-normal`}
          />
        </label>

        {errorKey && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
          >
            {t(errorKey)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={submit.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submit.isPending}>
            <SendOutlinedIcon fontSize="small" aria-hidden="true" />
            {t(
              submit.isPending
                ? 'common.saving'
                : sendsPreverification
                  ? 'submissions.form.sendPreverification'
                  : 'submissions.form.send',
            )}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
