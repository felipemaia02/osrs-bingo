import { useTranslation } from 'react-i18next'
import type { Submission } from '../types'

/** "Skeletal Visage · Vorkath" or "Pre-verification · Theatre of Blood". */
export function useSubmissionTitle(): (submission: Submission) => string {
  const { t } = useTranslation()
  return (submission) =>
    submission.kind === 'preverification'
      ? t('submissions.preverificationTitle', { card: submission.card_name })
      : `${submission.drop_name} · ${submission.card_name}`
}
