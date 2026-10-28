import { useMemo, useState } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { useSession } from '../../auth/hooks/useSession'
import type { BoardPosition } from '../../boards/types'
import { useOwnRegistration } from '../../teams/hooks/useTeams'
import { useOwnSubmissions } from '../hooks/useSubmissions'
import { preverificationStates } from '../preverification'
import { SubmitModal } from './SubmitModal'

interface BoardSubmitButtonProps {
  eventId: string
  positions: BoardPosition[]
}

/** Opens the submit modal straight from the board, for players who can submit (feature 044). */
export function BoardSubmitButton({ eventId, positions }: BoardSubmitButtonProps) {
  const { t } = useTranslation()
  const session = useSession()
  const registration = useOwnRegistration(eventId, session.data?.id)
  const own = registration.data
  const eligible = own?.status === 'approved' && Boolean(own.team_id)
  const submissions = useOwnSubmissions(eligible ? eventId : null)
  const gates = useMemo(
    () => preverificationStates(submissions.data?.items ?? []),
    [submissions.data],
  )
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!eligible) return null

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="primary"
        onClick={() => {
          setFeedback(null)
          setSubmitting(true)
        }}
      >
        <AddPhotoAlternateOutlinedIcon fontSize="small" aria-hidden="true" />
        {t('submissions.submit')}
      </Button>
      {feedback && (
        <p role="status" className="m-0 text-sm">
          {feedback}
        </p>
      )}
      {submitting && (
        <SubmitModal
          eventId={eventId}
          positions={positions}
          preverification={gates}
          onSent={(key) => {
            setSubmitting(false)
            setFeedback(t(key))
          }}
          onClose={() => setSubmitting(false)}
        />
      )}
    </div>
  )
}
