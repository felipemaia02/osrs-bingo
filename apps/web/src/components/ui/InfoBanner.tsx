import type { ReactNode } from 'react'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

/** Informational notice (design system "Info banner"): info border, tinted background. */
export function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded border border-rs-info bg-rs-info-bg px-3.5 py-2.5 text-rs-info-banner-text">
      <InfoOutlinedIcon fontSize="small" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
