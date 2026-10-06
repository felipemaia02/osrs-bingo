import { useState, type FormEvent } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { Badge } from '../../../components/ui/Badge'
import { Panel } from '../../../components/ui/Panel'
import { useCardMutations, useCards } from '../hooks/useCards'
import type {
  AcceptedDrop,
  CardCreatePayload,
  CardDifficulty,
  CardKind,
  CardRevisionPayload,
  CardSummary,
  WikiImage,
} from '../types'

interface CardForm {
  slug: string
  name: string
  description: string
  kind: CardKind
  difficulty: CardDifficulty
  tileScore: string
  requirement: string
  drops: string
  wikiArticle: string
  wikiImage: WikiImage | null
  ruleNote: string
  changeReason: string
}

const EMPTY_FORM: CardForm = {
  slug: '',
  name: '',
  description: '',
  kind: 'boss',
  difficulty: 'Low',
  tileScore: '5',
  requirement: '1',
  drops: '',
  wikiArticle: '',
  wikiImage: null,
  ruleNote: '',
  changeReason: '',
}

function parseDrops(value: string): AcceptedDrop[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawName, rawWeight] = line.split('|').map((part) => part.trim())
      const key = rawName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      return {
        key,
        name: rawName,
        progress_weight: Number(rawWeight),
        aliases: [],
        verification_note: null,
        counting_restriction: null,
      }
    })
}

function cardToForm(card: CardSummary): CardForm {
  const revision = card.revision
  return {
    slug: card.slug,
    name: revision.name,
    description: revision.description ?? '',
    kind: revision.kind,
    difficulty: revision.difficulty,
    tileScore: String(revision.tile_score),
    requirement: String(revision.completion_requirement),
    drops: revision.drops.map((drop) => `${drop.name} | ${drop.progress_weight}`).join('\n'),
    wikiArticle: revision.wiki_image?.article_title ?? revision.name,
    wikiImage: revision.wiki_image,
    ruleNote: revision.rule_note ?? '',
    changeReason: '',
  }
}

export function CardCatalogPage() {
  const { t } = useTranslation()
  const cards = useCards(true)
  const mutations = useCardMutations()
  const [editing, setEditing] = useState<CardSummary | null>(null)
  const [form, setForm] = useState<CardForm>(EMPTY_FORM)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const pending =
    mutations.create.isPending || mutations.revise.isPending || mutations.resolveImage.isPending

  function update<K extends keyof CardForm>(key: K, value: CardForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFeedback(null)
    setShowForm(true)
  }

  function openEdit(card: CardSummary) {
    setEditing(card)
    setForm(cardToForm(card))
    setFeedback(null)
    setShowForm(true)
  }

  async function resolveImage() {
    if (!form.wikiArticle.trim()) return
    setFeedback(null)
    try {
      update('wikiImage', await mutations.resolveImage.mutateAsync(form.wikiArticle.trim()))
    } catch {
      setFeedback(t('cards.errors.wiki'))
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    const drops = parseDrops(form.drops)
    if (drops.some((drop) => !drop.name || !drop.key || !(drop.progress_weight > 0))) {
      setFeedback(t('cards.errors.drops'))
      return
    }
    const revision: CardRevisionPayload = {
      name: form.name,
      description: form.description || null,
      kind: form.kind,
      difficulty: form.difficulty,
      tile_score: Number(form.tileScore),
      completion_requirement: Number(form.requirement),
      drops,
      wiki_image: form.wikiImage,
      fallback_image_accepted: !form.wikiImage,
      rule_note: form.ruleNote || null,
      change_reason: form.changeReason,
    }
    try {
      if (editing) {
        await mutations.revise.mutateAsync({
          cardId: editing.id,
          expectedRevision: editing.current_revision,
          payload: revision,
        })
      } else {
        await mutations.create.mutateAsync({ ...revision, slug: form.slug } as CardCreatePayload)
      }
      setShowForm(false)
      setFeedback(t(editing ? 'cards.feedback.revised' : 'cards.feedback.created'))
    } catch (error) {
      const detail = error instanceof AxiosError ? error.response?.data?.detail : null
      setFeedback(
        detail === 'Card changed while you were editing'
          ? t('cards.errors.changed')
          : detail === 'Card slug already exists'
            ? t('cards.errors.slug')
            : t('common.apiError'),
      )
    }
  }

  async function importWorkbook() {
    setFeedback(null)
    try {
      const result = await mutations.importWorkbook.mutateAsync()
      setFeedback(
        result.usable
          ? t('cards.feedback.imported', {
              imported: result.imported_cards,
              existing: result.existing_cards,
            })
          : t('cards.errors.importConflict', { slugs: result.conflicting_slugs.join(', ') }),
      )
    } catch {
      setFeedback(t('common.apiError'))
    }
  }

  async function retire(card: CardSummary) {
    if (!window.confirm(t('cards.retireConfirm', { name: card.revision.name }))) return
    await mutations.retire.mutateAsync({
      cardId: card.id,
      expectedRevision: card.current_revision,
    })
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-rs-text">{t('cards.title')}</h1>
            <p className="mt-2 max-w-3xl text-sm text-rs-muted">{t('cards.description')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void importWorkbook()}
              disabled={mutations.importWorkbook.isPending}
              className="flex items-center gap-2 rounded-sm border border-rs-border px-3 py-2 text-sm text-rs-gold disabled:opacity-50"
            >
              <FileUploadOutlinedIcon fontSize="small" aria-hidden="true" />
              {t('cards.importWorkbook')}
            </button>
            <button
              onClick={openCreate}
              className="rounded-sm bg-rs-gold px-4 py-2 text-sm font-semibold text-rs-inset"
            >
              {t('cards.create')}
            </button>
          </div>
        </div>
        {feedback && (
          <p role="status" className="rounded-sm border border-rs-border bg-rs-inset p-3 text-sm">
            {feedback}
          </p>
        )}
        {showForm && (
          <CardEditor
            form={form}
            editing={editing}
            pending={pending}
            update={update}
            resolveImage={resolveImage}
            submit={submit}
            close={() => setShowForm(false)}
          />
        )}
        <Panel className="overflow-hidden">
          {cards.isLoading && <p className="p-5 text-rs-muted">{t('common.loading')}</p>}
          {cards.isError && <p className="p-5 text-rs-muted">{t('common.apiError')}</p>}
          {cards.data && !cards.data.length && (
            <p className="p-5 text-rs-muted">{t('cards.empty')}</p>
          )}
          <ul className="divide-y divide-rs-border/40">
            {cards.data?.map((card) => (
              <li key={card.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="size-16 overflow-hidden rounded-sm border border-rs-border bg-rs-inset">
                  {card.revision.wiki_image && (
                    <img
                      src={card.revision.wiki_image.image_url}
                      alt=""
                      className="size-full object-contain"
                    />
                  )}
                </div>
                <div className="min-w-52 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-rs-text">{card.revision.name}</h2>
                    <Badge tone={card.status === 'active' ? 'success' : 'danger'}>
                      {t(`cards.status.${card.status}`)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-rs-muted">
                    {t('cards.summary', {
                      difficulty: t(`tile.tier.${card.revision.difficulty}`),
                      score: card.revision.tile_score,
                      requirement: card.revision.completion_requirement,
                      drops: card.revision.drops.length,
                      revision: card.current_revision,
                    })}
                  </p>
                </div>
                {card.status === 'active' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(card)}
                      aria-label={t('cards.edit', { name: card.revision.name })}
                      className="rounded-sm border border-rs-border p-2 text-rs-gold"
                    >
                      <EditOutlinedIcon fontSize="small" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => void retire(card)}
                      aria-label={t('cards.retire', { name: card.revision.name })}
                      className="rounded-sm border border-rs-border p-2 text-rs-danger"
                    >
                      <ArchiveOutlinedIcon fontSize="small" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  )
}

interface EditorProps {
  form: CardForm
  editing: CardSummary | null
  pending: boolean
  update: <K extends keyof CardForm>(key: K, value: CardForm[K]) => void
  resolveImage: () => Promise<void>
  submit: (event: FormEvent) => Promise<void>
  close: () => void
}

function CardEditor({ form, editing, pending, update, resolveImage, submit, close }: EditorProps) {
  const { t } = useTranslation()
  const input = 'mt-1 w-full rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text'
  return (
    <Panel className="p-5">
      <h2 className="font-display text-lg text-rs-gold-bright">
        {t(editing ? 'cards.form.reviseTitle' : 'cards.form.createTitle')}
      </h2>
      <form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-4 md:grid-cols-2">
        {!editing && (
          <label className="text-sm text-rs-muted">
            {t('cards.form.slug')}
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={form.slug}
              onChange={(event) => update('slug', event.target.value)}
              className={input}
            />
          </label>
        )}
        <label className="text-sm text-rs-muted">
          {t('cards.form.name')}
          <input
            required
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            className={input}
          />
        </label>
        <label className="text-sm text-rs-muted">
          {t('cards.form.kind')}
          <select
            value={form.kind}
            onChange={(event) => update('kind', event.target.value as CardKind)}
            className={input}
          >
            {(['boss', 'boss_group', 'raid', 'activity', 'task'] as const).map((kind) => (
              <option key={kind} value={kind}>
                {t(`cards.kind.${kind}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-rs-muted">
          {t('cards.form.difficulty')}
          <select
            value={form.difficulty}
            onChange={(event) => update('difficulty', event.target.value as CardDifficulty)}
            className={input}
          >
            {(['Low', 'Mid', 'High'] as const).map((difficulty) => (
              <option key={difficulty}>{difficulty}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-rs-muted">
          {t('cards.form.score')}
          <input
            required
            type="number"
            min="0"
            step="0.5"
            value={form.tileScore}
            onChange={(event) => update('tileScore', event.target.value)}
            className={input}
          />
        </label>
        <label className="text-sm text-rs-muted">
          {t('cards.form.requirement')}
          <input
            required
            type="number"
            min="0.1"
            step="0.1"
            value={form.requirement}
            onChange={(event) => update('requirement', event.target.value)}
            className={input}
          />
        </label>
        <label className="text-sm text-rs-muted md:col-span-2">
          {t('cards.form.description')}
          <textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            className={input}
          />
        </label>
        <label className="text-sm text-rs-muted md:col-span-2">
          {t('cards.form.drops')}
          <textarea
            required
            rows={5}
            value={form.drops}
            onChange={(event) => update('drops', event.target.value)}
            placeholder={t('cards.form.dropsPlaceholder')}
            className={input}
          />
        </label>
        <div className="md:col-span-2">
          <label className="text-sm text-rs-muted">
            {t('cards.form.wikiArticle')}
            <div className="mt-1 flex gap-2">
              <input
                value={form.wikiArticle}
                onChange={(event) => update('wikiArticle', event.target.value)}
                className="min-w-0 flex-1 rounded-sm border border-rs-border bg-rs-inset p-2 text-rs-text"
              />
              <button
                type="button"
                disabled={pending || !form.wikiArticle.trim()}
                onClick={() => void resolveImage()}
                className="flex items-center gap-2 rounded-sm border border-rs-border px-3 text-sm text-rs-gold disabled:opacity-50"
              >
                <AddPhotoAlternateOutlinedIcon fontSize="small" aria-hidden="true" />
                {t('cards.form.resolveImage')}
              </button>
            </div>
          </label>
          {form.wikiImage && (
            <div className="mt-3 flex items-center gap-3 text-xs text-rs-muted">
              <img src={form.wikiImage.image_url} alt="" className="size-16 object-contain" />
              <span>{form.wikiImage.file_name}</span>
            </div>
          )}
        </div>
        <label className="text-sm text-rs-muted md:col-span-2">
          {t('cards.form.ruleNote')}
          <textarea
            value={form.ruleNote}
            onChange={(event) => update('ruleNote', event.target.value)}
            className={input}
          />
        </label>
        <label className="text-sm text-rs-muted md:col-span-2">
          {t('cards.form.changeReason')}
          <input
            required
            value={form.changeReason}
            onChange={(event) => update('changeReason', event.target.value)}
            className={input}
          />
        </label>
        <div className="flex justify-end gap-3 md:col-span-2">
          <button type="button" onClick={close} className="px-3 py-2 text-sm text-rs-muted">
            {t('common.cancel')}
          </button>
          <button
            disabled={pending}
            className="rounded-sm bg-rs-gold px-4 py-2 text-sm font-semibold text-rs-inset disabled:opacity-50"
          >
            {t(pending ? 'common.saving' : 'common.save')}
          </button>
        </div>
      </form>
    </Panel>
  )
}
