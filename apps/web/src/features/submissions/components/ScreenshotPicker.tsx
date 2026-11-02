import { useEffect, useMemo } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import { useTranslation } from 'react-i18next'
import { ACCEPTED_SCREENSHOT_TYPES } from '../screenshotFile'

interface ScreenshotPickerProps {
  file: File | null
  onPick: (file: File | null) => void
}

/** Screenshot file control with a preview (submit modal, feature 057 upload). */
export function ScreenshotPicker({ file, onPick }: ScreenshotPickerProps) {
  const { t } = useTranslation()
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold">{t('submissions.form.screenshot')}</span>
      <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[3px] border border-dashed border-rs-border-strong bg-rs-inset px-3 py-2 text-sm">
        <AddPhotoAlternateOutlinedIcon fontSize="small" aria-hidden="true" />
        {file ? file.name : t('submissions.form.chooseScreenshot')}
        <input
          type="file"
          accept={ACCEPTED_SCREENSHOT_TYPES.join(',')}
          onChange={(change) => onPick(change.target.files?.[0] ?? null)}
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
  )
}
