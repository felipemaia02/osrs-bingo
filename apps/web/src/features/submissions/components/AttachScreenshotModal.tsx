import { useState, type FormEvent } from 'react'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { submissionErrorKey } from '../errors'
import { useAttachScreenshot } from '../hooks/useSubmissions'
import { useSubmissionTitle } from '../hooks/useSubmissionTitle'
import type { Submission } from '../types'
import { screenshotFileError } from '../screenshotFile'
import { ScreenshotPicker } from './ScreenshotPicker'

interface AttachScreenshotModalProps {
  submission: Submission
  onSent: () => void
  onClose: () => void
}

/** Sends the screenshot DropTracker didn't take (feature 057). */
export function AttachScreenshotModal({ submission, onSent, onClose }: AttachScreenshotModalProps) {
  const { t } = useTranslation()
  const title = useSubmissionTitle()
  const attach = useAttachScreenshot()
  const [file, setFile] = useState<File | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  function pickFile(next: File | null) {
    const problem = next && screenshotFileError(next)
    setErrorKey(problem)
    if (!problem) setFile(next)
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!file) return setErrorKey('submissions.errors.screenshotRequired')
    setErrorKey(null)
    try {
      await attach.mutateAsync({ submissionId: submission.id, screenshot: file })
      onSent()
    } catch (error) {
      setErrorKey(submissionErrorKey(error))
    }
  }

  return (
    <FormModal title={title(submission)} size="sm" busy={attach.isPending} onClose={onClose}>
      <form onSubmit={(event) => void send(event)} className="flex flex-col gap-4">
        <p className="m-0 text-sm">{t('submissions.missingScreenshot.modalHint')}</p>
        <ScreenshotPicker file={file} onPick={pickFile} />
        {errorKey && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-danger-bg p-3 text-sm"
          >
            {t(errorKey)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={attach.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={attach.isPending}>
            <SendOutlinedIcon fontSize="small" aria-hidden="true" />
            {t(attach.isPending ? 'common.saving' : 'submissions.missingScreenshot.send')}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
