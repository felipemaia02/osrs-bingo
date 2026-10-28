import { useState } from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { cardErrorKey } from '../cardForm'
import { CardCatalogCards, CardCatalogTable } from '../components/CardCatalogList'
import { CardCatalogToolbar } from '../components/CardCatalogToolbar'
import { CardDetailPanel } from '../components/CardDetailPanel'
import { CardEditorModal } from '../components/CardEditorModal'
import { WorkbookImportModal } from '../components/WorkbookImportModal'
import { useCatalogView } from '../hooks/useCatalogView'
import { useCardMutations, useCards } from '../hooks/useCards'
import type { CardSummary } from '../types'

/** Layout v2 card catalog (no mockup; design system + board/builder/teams v2 patterns). */
export function CardCatalogPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const cards = useCards(true)
  const view = useCatalogView(cards.data ?? [])
  const { retire, linkItems } = useCardMutations()
  const [editor, setEditor] = useState<{ card: CardSummary | null } | null>(null)
  const [importing, setImporting] = useState(false)
  const [retiring, setRetiring] = useState<CardSummary | null>(null)
  const [retireError, setRetireError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  function openEditor(card: CardSummary | null) {
    setFeedback(null)
    setEditor({ card })
  }

  function openRetire(card: CardSummary) {
    setFeedback(null)
    setRetireError(null)
    setRetiring(card)
  }

  async function confirmRetire() {
    if (!retiring) return
    setRetireError(null)
    try {
      await retire.mutateAsync({ cardId: retiring.id, expectedRevision: retiring.current_revision })
      setFeedback(t('cards.feedback.retired', { name: retiring.revision.name }))
      setRetiring(null)
    } catch (error) {
      setRetireError(t(cardErrorKey(error)))
    }
  }

  async function linkDrops() {
    setFeedback(null)
    try {
      const result = await linkItems.mutateAsync()
      const categorized = result.categorized_cards ?? 0
      setFeedback(
        [
          t('cards.feedback.linked', {
            cards: result.linked_cards,
            drops: result.linked_drops,
            unlinked: result.unlinked_drops,
          }),
          categorized ? t('cards.feedback.categorized', { count: categorized }) : '',
        ]
          .filter(Boolean)
          .join(' '),
      )
    } catch {
      setFeedback(t('common.apiError'))
    }
  }

  const hasUnlinked = (cards.data ?? []).some(
    (card) =>
      card.status === 'active' && card.revision.drops.some((drop) => !drop.item_ids?.length),
  )

  const actions = (
    <div className={`flex flex-wrap gap-2 ${isDesktop ? '' : 'w-full'}`}>
      {hasUnlinked && (
        <Button
          className={isDesktop ? '' : 'flex-1'}
          disabled={linkItems.isPending}
          onClick={() => void linkDrops()}
        >
          <LinkOutlinedIcon fontSize="small" aria-hidden="true" />
          {t(linkItems.isPending ? 'common.saving' : 'cards.linkItems')}
        </Button>
      )}
      <Button
        className={isDesktop ? '' : 'flex-1'}
        onClick={() => {
          setFeedback(null)
          setImporting(true)
        }}
      >
        <FileUploadOutlinedIcon fontSize="small" aria-hidden="true" />
        {t('cards.importWorkbook')}
      </Button>
      <Button
        variant="primary"
        className={isDesktop ? '' : 'flex-1'}
        onClick={() => openEditor(null)}
      >
        <AddOutlinedIcon fontSize="small" aria-hidden="true" />
        {t('cards.create')}
      </Button>
    </div>
  )
  const empty = (
    <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
      {t(cards.data?.length ? 'cards.noResults' : 'cards.empty')}
    </p>
  )

  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="flex flex-col gap-3 md:gap-4">
        {isDesktop ? (
          <div className="flex items-end justify-between gap-5">
            <div className="flex max-w-3xl flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[.18em] text-rs-gold">
                {t('admin.title')}
              </span>
              <h1 className="m-0 font-display text-[30px] font-bold leading-[1.15] text-rs-gold-bright">
                {t('cards.title')}
              </h1>
              <span className="text-rs-muted">{t('cards.description')}</span>
            </div>
            {actions}
          </div>
        ) : (
          <>
            <Link
              to="/admin"
              className="inline-flex min-h-8 items-center gap-0.5 self-start text-[13px] text-rs-gold-bright"
            >
              <ChevronLeftOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
              {t('admin.title')}
            </Link>
            <h1 className="m-0 font-display text-[23px] font-bold leading-[1.15] text-rs-gold-bright">
              {t('cards.title')}
            </h1>
            {actions}
          </>
        )}
        {feedback && (
          <p role="status" className="m-0 text-sm">
            {feedback}
          </p>
        )}
        {cards.isLoading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : cards.isError ? (
          <p role="alert">{t('common.apiError')}</p>
        ) : (
          <>
            <CardCatalogToolbar
              query={view.query}
              onQueryChange={view.setQuery}
              status={view.status}
              onStatusChange={view.setStatus}
              difficulty={view.difficulty}
              onDifficultyChange={view.setDifficulty}
              category={view.category}
              onCategoryChange={view.setCategory}
              counts={view.counts}
              resultCount={view.visible.length}
              mobile={!isDesktop}
            />
            {isDesktop ? (
              <div className="flex items-start gap-5">
                <div className="min-w-0 flex-1">
                  {view.visible.length ? (
                    <div className="overflow-hidden rounded border border-rs-border bg-rs-surface">
                      <CardCatalogTable
                        cards={view.visible}
                        selectedId={view.selected?.id ?? null}
                        onSelect={(card) => view.setSelectedId(card.id)}
                        onEdit={openEditor}
                        onRetire={openRetire}
                      />
                    </div>
                  ) : (
                    empty
                  )}
                </div>
                <CardDetailPanel card={view.selected} onClose={() => view.setSelectedId(null)} />
              </div>
            ) : view.visible.length ? (
              <CardCatalogCards cards={view.visible} onEdit={openEditor} onRetire={openRetire} />
            ) : (
              empty
            )}
            {cards.data?.some((card) => card.revision.wiki_image) && (
              <p className="m-0 text-xs text-rs-muted">
                {t('board.attribution.prefix')}{' '}
                <a
                  href="https://oldschool.runescape.wiki/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-rs-gold-bright hover:text-rs-gold-hover"
                >
                  OSRS Wiki
                </a>
                . {t('board.attribution.fallback')}
              </p>
            )}
          </>
        )}
      </div>
      {editor && (
        <CardEditorModal
          card={editor.card}
          onSaved={(key) => {
            setEditor(null)
            setFeedback(t(key))
          }}
          onClose={() => setEditor(null)}
        />
      )}
      {importing && (
        <WorkbookImportModal
          onImported={(message) => {
            setImporting(false)
            setFeedback(message)
          }}
          onClose={() => setImporting(false)}
        />
      )}
      {retiring && (
        <ConfirmDialog
          title={t('cards.retireTitle')}
          message={t('cards.retireConfirm', { name: retiring.revision.name })}
          confirmLabel={t('cards.retireShort')}
          danger
          busy={retire.isPending}
          error={retireError}
          onConfirm={() => void confirmRetire()}
          onClose={() => setRetiring(null)}
        />
      )}
    </AppShell>
  )
}
