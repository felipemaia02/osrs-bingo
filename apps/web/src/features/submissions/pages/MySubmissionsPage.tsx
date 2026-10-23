import { useMemo, useState } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Button } from '../../../components/ui/Button'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useSession } from '../../auth/hooks/useSession'
import { usePublicBoard } from '../../boards/hooks/useBoards'
import { useEvents } from '../../events/hooks/useEvents'
import { useOwnRegistration, useTeams } from '../../teams/hooks/useTeams'
import { SubmissionCard } from '../components/SubmissionCard'
import { SubmitModal } from '../components/SubmitModal'
import { useOwnSubmissions } from '../hooks/useSubmissions'
import { preverificationStates } from '../preverification'
import type { SubmissionStatus } from '../types'

type StatusTab = SubmissionStatus | 'all'
const TABS: StatusTab[] = ['all', 'pending', 'accepted', 'rejected']

/** The player's own submissions for the active event (future-my-submissions). */
export function MySubmissionsPage() {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const session = useSession()
  const events = useEvents('active')
  const event = events.data?.find((candidate) => candidate.status === 'active') ?? null
  const registration = useOwnRegistration(event?.id ?? '', event ? session.data?.id : undefined)
  const teams = useTeams(registration.data?.team_id ? (event?.id ?? null) : null)
  const board = usePublicBoard(event?.id ?? null)
  const submissions = useOwnSubmissions(event && session.data ? event.id : null)
  const [tab, setTab] = useState<StatusTab>('all')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const own = registration.data
  const team = teams.data?.find((candidate) => candidate.id === own?.team_id)
  const eligible = own?.status === 'approved' && Boolean(own.team_id) && Boolean(board.data)
  const items = useMemo(() => submissions.data?.items ?? [], [submissions.data])
  const visible = tab === 'all' ? items : items.filter((item) => item.status === tab)
  const gates = useMemo(() => preverificationStates(items), [items])

  const blocker = !session.data
    ? 'submissions.blocked.login'
    : !event
      ? 'submissions.blocked.noEvent'
      : !own
        ? 'submissions.blocked.notRegistered'
        : own.status !== 'approved'
          ? 'submissions.blocked.notApproved'
          : !own.team_id
            ? 'submissions.blocked.noTeam'
            : null

  return (
    <AppShell desktopPadding="md:px-8 md:pt-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 md:gap-4">
        <div className="flex flex-col gap-1">
          {event && (
            <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
              {team ? `${event.name} · ${team.name}` : event.name}
            </span>
          )}
          <h1 className="m-0 font-display text-[24px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
            {t('submissions.title')}
          </h1>
          <span className="text-[13px] text-rs-muted md:text-sm">
            {t('submissions.description')}
          </span>
        </div>
        {session.isLoading || events.isLoading ? (
          <p role="status" className="text-rs-muted">
            {t('common.loading')}
          </p>
        ) : blocker ? (
          <InfoBanner>
            {t(blocker)}{' '}
            {blocker === 'submissions.blocked.login' && (
              <Link to="/login" className="font-semibold text-rs-gold-bright">
                {t('auth.login')}
              </Link>
            )}
          </InfoBanner>
        ) : (
          <>
            <Button
              variant="primary"
              className={isDesktop ? 'self-start' : 'w-full'}
              disabled={!eligible}
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
            <SegmentedControl<StatusTab>
              label={t('submissions.filterLabel')}
              variant="chip"
              value={tab}
              onChange={setTab}
              options={TABS.map((value) => ({
                value,
                label: `${t(`submissions.tabs.${value}`)} ${submissions.data?.counts[value] ?? 0}`,
              }))}
            />
            {submissions.isLoading ? (
              <p role="status" className="text-rs-muted">
                {t('common.loading')}
              </p>
            ) : submissions.isError ? (
              <p role="alert">{t('common.apiError')}</p>
            ) : visible.length ? (
              <div className="flex flex-col gap-3">
                {visible.map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            ) : (
              <p className="m-0 rounded border border-rs-border bg-rs-surface p-8 text-center text-rs-muted">
                {t(items.length ? 'submissions.emptyFilter' : 'submissions.empty')}
              </p>
            )}
          </>
        )}
      </div>
      {submitting && event && board.data && (
        <SubmitModal
          eventId={event.id}
          positions={board.data.positions}
          preverification={gates}
          onSent={(key) => {
            setSubmitting(false)
            setFeedback(t(key))
          }}
          onClose={() => setSubmitting(false)}
        />
      )}
    </AppShell>
  )
}
