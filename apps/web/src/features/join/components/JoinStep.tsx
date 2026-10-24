import type { ReactNode } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined'
import { useTranslation } from 'react-i18next'
import { Panel } from '../../../components/ui/Panel'

interface JoinStepProps {
  index: number
  title: string
  /** Desktop shows every step open; mobile is an accordion (join-mobile). */
  accordion: boolean
  open: boolean
  done: boolean
  summary?: string
  headerAction?: ReactNode
  onOpen: () => void
  children: ReactNode
}

export function JoinStep({
  index,
  title,
  accordion,
  open,
  done,
  summary,
  headerAction,
  onOpen,
  children,
}: JoinStepProps) {
  const { t } = useTranslation()
  const headingId = `join-step-${index}`
  const label = `${index + 1} · ${title}`
  if (!accordion)
    return (
      <Panel as="section" aria-labelledby={headingId} className="flex flex-col gap-3 p-[18px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={headingId} className="m-0 font-display text-lg font-bold text-rs-gold-bright">
            {label}
          </h2>
          {headerAction}
        </div>
        {children}
      </Panel>
    )

  const badge =
    done && !open
      ? 'bg-rs-success text-rs-canvas border-rs-success'
      : open
        ? 'bg-rs-gold text-rs-canvas border-rs-gold'
        : 'border-rs-border'
  return (
    <Panel as="section" aria-labelledby={headingId}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${headingId}-body`}
        onClick={onOpen}
        className="flex min-h-[60px] w-full items-center gap-2.5 bg-transparent px-3 py-2.5 text-left text-rs-text"
      >
        <span
          aria-hidden="true"
          className={`inline-flex size-[26px] shrink-0 items-center justify-center rounded-full border text-xs font-bold ${badge}`}
        >
          {done && !open ? <CheckIcon sx={{ fontSize: 16 }} /> : index + 1}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <strong id={headingId}>{title}</strong>
          {!open && summary && (
            <span className="truncate text-[13px] text-rs-muted">{summary}</span>
          )}
        </span>
        {open ? (
          <ExpandLessOutlinedIcon aria-hidden="true" />
        ) : (
          <span className="text-[13px] text-rs-muted">{t('join.edit')}</span>
        )}
      </button>
      {open && (
        <div id={`${headingId}-body`} className="flex flex-col gap-3 px-3 pb-3">
          {headerAction}
          {children}
        </div>
      )}
    </Panel>
  )
}
