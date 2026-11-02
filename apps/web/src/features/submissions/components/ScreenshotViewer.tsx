import { useState } from 'react'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import { useTranslation } from 'react-i18next'
import { FormModal } from '../../../components/ui/FormModal'
import { LoadingImage } from '../../../components/ui/LoadingImage'

/** A submission screenshot shown large in a modal instead of a new tab (feature 056). */
export function ScreenshotViewer({
  url,
  title,
  onClose,
}: {
  url: string
  title: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  return (
    <FormModal title={title} busy={false} size="xl" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex h-[70dvh] items-center justify-center overflow-hidden rounded-[3px] bg-rs-inset">
          {failed ? (
            <span className="flex flex-col items-center gap-1 text-sm text-rs-muted">
              <ImageOutlinedIcon aria-hidden="true" />
              {t('submissions.screenshotUnavailable')}
            </span>
          ) : (
            <LoadingImage
              src={url}
              alt={t('submissions.screenshotAlt')}
              onFail={() => setFailed(true)}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 self-end text-xs text-rs-gold-bright hover:text-rs-gold-hover"
        >
          <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
          {t('submissions.openOriginal')}
        </a>
      </div>
    </FormModal>
  )
}
