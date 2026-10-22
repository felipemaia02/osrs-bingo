import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { FormModal } from './FormModal'

interface ConfirmDialogProps {
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  busy: boolean
  /** API error shown inside the dialog. */
  error?: string | null
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
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-rs-danger/60 bg-rs-inset p-3 text-sm"
        >
          {error}
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
