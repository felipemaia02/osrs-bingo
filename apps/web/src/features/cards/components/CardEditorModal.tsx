import { useState, type FormEvent, type ReactNode } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { CardImage } from '../../../components/ui/CardImage'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { FormModal } from '../../../components/ui/FormModal'
import {
  CARD_DIFFICULTIES,
  CARD_KINDS,
  EMPTY_FORM,
  cardErrorKey,
  cardToForm,
  toRevisionPayload,
  type CardForm,
} from '../cardForm'
import { useCardMutations } from '../hooks/useCards'
import type { CardCreatePayload, CardDifficulty, CardKind, CardSummary } from '../types'

const FIELD = `${FIELD_CLASS} font-normal`
const TEXTAREA = `${FIELD} resize-y py-2`

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label
      className={`flex flex-col gap-1 text-[13px] font-semibold ${wide ? 'md:col-span-2' : ''}`}
    >
      {label}
      {children}
    </label>
  )
}

interface CardEditorModalProps {
  /** null creates a new card. */
  card: CardSummary | null
  onSaved: (messageKey: string) => void
  onClose: () => void
}

/** Create a card or publish a new revision (feature 007 rules); errors stay inside. */
export function CardEditorModal({ card, onSaved, onClose }: CardEditorModalProps) {
  const { t } = useTranslation()
  const mutations = useCardMutations()
  const [form, setForm] = useState<CardForm>(() => (card ? cardToForm(card) : EMPTY_FORM))
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const pending =
    mutations.create.isPending || mutations.revise.isPending || mutations.resolveImage.isPending

  function update<K extends keyof CardForm>(key: K, value: CardForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function resolveImage() {
    if (!form.wikiArticle.trim()) return
    setErrorKey(null)
    try {
      update('wikiImage', await mutations.resolveImage.mutateAsync(form.wikiArticle.trim()))
    } catch {
      setErrorKey('cards.errors.wiki')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)
    const revision = toRevisionPayload(form, card?.revision.drops)
    if (!revision) {
      setErrorKey('cards.errors.drops')
      return
    }
    try {
      if (card)
        await mutations.revise.mutateAsync({
          cardId: card.id,
          expectedRevision: card.current_revision,
          payload: revision,
        })
      else await mutations.create.mutateAsync({ ...revision, slug: form.slug } as CardCreatePayload)
      onSaved(card ? 'cards.feedback.revised' : 'cards.feedback.created')
    } catch (error) {
      setErrorKey(cardErrorKey(error))
    }
  }

  return (
    <FormModal
      title={t(card ? 'cards.form.reviseTitle' : 'cards.form.createTitle')}
      busy={pending}
      onClose={onClose}
    >
      {errorKey && (
        <p
          role="alert"
          className="mb-4 mt-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
        >
          {t(errorKey)}
        </p>
      )}
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={pending} className="m-0 grid min-w-0 gap-4 border-0 p-0 md:grid-cols-2">
          {!card && (
            <Field label={t('cards.form.slug')}>
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={form.slug}
                onChange={(event) => update('slug', event.target.value)}
                className={FIELD}
              />
            </Field>
          )}
          <Field label={t('cards.form.name')}>
            <input
              required
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              className={FIELD}
            />
          </Field>
          <Field label={t('cards.form.kind')}>
            <select
              value={form.kind}
              onChange={(event) => update('kind', event.target.value as CardKind)}
              className={FIELD}
            >
              {CARD_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`cards.kind.${kind}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('cards.form.difficulty')}>
            <select
              value={form.difficulty}
              onChange={(event) => update('difficulty', event.target.value as CardDifficulty)}
              className={FIELD}
            >
              {CARD_DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {t(`tile.tier.${difficulty}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('cards.form.score')}>
            <input
              required
              type="number"
              min="0"
              step="0.5"
              value={form.tileScore}
              onChange={(event) => update('tileScore', event.target.value)}
              className={FIELD}
            />
          </Field>
          <Field label={t('cards.form.requirement')}>
            <input
              required
              type="number"
              min="0.1"
              step="0.1"
              value={form.requirement}
              onChange={(event) => update('requirement', event.target.value)}
              className={FIELD}
            />
          </Field>
          <Field label={t('cards.form.description')} wide>
            <textarea
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              className={TEXTAREA}
            />
          </Field>
          <Field label={t('cards.form.drops')} wide>
            <textarea
              required
              rows={5}
              value={form.drops}
              onChange={(event) => update('drops', event.target.value)}
              placeholder={t('cards.form.dropsPlaceholder')}
              className={TEXTAREA}
            />
          </Field>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Field label={t('cards.form.wikiArticle')}>
              <span className="flex gap-2">
                <input
                  value={form.wikiArticle}
                  onChange={(event) => update('wikiArticle', event.target.value)}
                  className={`${FIELD} min-w-0 flex-1`}
                />
                <Button
                  disabled={pending || !form.wikiArticle.trim()}
                  onClick={() => void resolveImage()}
                >
                  <AddPhotoAlternateOutlinedIcon fontSize="small" aria-hidden="true" />
                  {t('cards.form.resolveImage')}
                </Button>
              </span>
            </Field>
            <span className="flex items-center gap-3 text-xs text-rs-muted">
              <CardImage
                name={form.name || '?'}
                imageUrl={form.wikiImage?.image_url}
                className="size-16 shrink-0"
              />
              {form.wikiImage ? form.wikiImage.file_name : t('cards.form.fallbackImage')}
            </span>
          </div>
          <Field label={t('cards.form.ruleNote')} wide>
            <textarea
              value={form.ruleNote}
              onChange={(event) => update('ruleNote', event.target.value)}
              className={TEXTAREA}
            />
          </Field>
          <label className="flex items-start gap-2.5 rounded-[3px] border border-rs-border bg-rs-inset p-3 text-[13px] md:col-span-2">
            <input
              type="checkbox"
              checked={form.requiresPreverification}
              onChange={(event) => update('requiresPreverification', event.target.checked)}
              className="mt-0.5 size-[18px] shrink-0 accent-rs-gold"
            />
            <span className="flex flex-col gap-0.5">
              <strong>{t('cards.form.requiresPreverification')}</strong>
              <span className="text-rs-muted">{t('cards.form.requiresPreverificationHint')}</span>
            </span>
          </label>
          <Field label={t('cards.form.changeReason')} wide>
            <input
              required
              value={form.changeReason}
              onChange={(event) => update('changeReason', event.target.value)}
              className={FIELD}
            />
          </Field>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary">
              <SaveOutlinedIcon fontSize="small" aria-hidden="true" />
              {t(pending ? 'common.saving' : 'common.save')}
            </Button>
          </div>
        </fieldset>
      </form>
    </FormModal>
  )
}
