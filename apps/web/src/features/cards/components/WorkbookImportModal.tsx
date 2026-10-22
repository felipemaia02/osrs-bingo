import { useState } from 'react'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { useCardMutations } from '../hooks/useCards'

interface WorkbookImportModalProps {
  onImported: (message: string) => void
  onClose: () => void
}

/** Confirms the approved workbook import; conflicts and failures stay inside. */
export function WorkbookImportModal({ onImported, onClose }: WorkbookImportModalProps) {
  const { t } = useTranslation()
  const { importWorkbook } = useCardMutations()
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null)
    try {
      const result = await importWorkbook.mutateAsync()
      if (result.usable)
        onImported(
          t('cards.feedback.imported', {
            imported: result.imported_cards,
            existing: result.existing_cards,
          }),
        )
      else
        setError(t('cards.errors.importConflict', { slugs: result.conflicting_slugs.join(', ') }))
    } catch {
      setError(t('common.apiError'))
    }
  }

  return (
    <FormModal
      title={t('cards.importWorkbook')}
      busy={importWorkbook.isPending}
      size="sm"
      onClose={onClose}
    >
      <p className="mt-0 text-sm text-rs-muted">{t('cards.importDescription')}</p>
      {error && (
        <p
          role="alert"
          className="rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
        >
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose} disabled={importWorkbook.isPending}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={() => void run()} disabled={importWorkbook.isPending}>
          <FileUploadOutlinedIcon fontSize="small" aria-hidden="true" />
          {t(importWorkbook.isPending ? 'common.saving' : 'cards.importWorkbook')}
        </Button>
      </div>
    </FormModal>
  )
}
