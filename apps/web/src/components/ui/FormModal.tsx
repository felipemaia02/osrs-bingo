import type { ReactNode } from 'react'
import Modal from '@mui/material/Modal'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { useTranslation } from 'react-i18next'

interface FormModalProps {
  title: string
  busy: boolean
  size?: 'sm' | 'lg'
  onClose: () => void
  children: ReactNode
}

const SIZE_CLASS = { sm: 'max-w-md', lg: 'max-w-3xl' } as const

export function FormModal({ title, busy, size = 'lg', onClose, children }: FormModalProps) {
  const { t } = useTranslation()
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      className="flex items-center justify-center p-3 sm:p-6"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
        aria-busy={busy}
        tabIndex={-1}
        className={`flex max-h-[90dvh] w-full ${SIZE_CLASS[size]} flex-col overflow-hidden rounded border border-rs-border bg-rs-surface text-rs-text shadow-rs-panel outline-none`}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-rs-border px-5 py-4">
          <h2 id="form-modal-title" className="font-display text-lg text-rs-gold-bright">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t('common.close')}
            title={t('common.close')}
            className="rounded-sm p-1 text-rs-muted hover:text-rs-gold disabled:opacity-40"
          >
            <CloseOutlinedIcon aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </section>
    </Modal>
  )
}
