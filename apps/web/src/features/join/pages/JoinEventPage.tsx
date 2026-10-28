import { useState, type ReactNode } from 'react'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../../components/common/AppShell'
import { Button } from '../../../components/ui/Button'
import { InfoBanner } from '../../../components/ui/InfoBanner'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { useSession } from '../../auth/hooks/useSession'
import { EventSchedule } from '../../events/components/EventSchedule'
import { useEvents } from '../../events/hooks/useEvents'
import type { BingoEvent } from '../../events/types'
import { hasWomStats } from '../../profiles/accounts'
import { useProfile } from '../../profiles/hooks/useProfile'
import type { Profile } from '../../profiles/types'
import { teamErrorKey } from '../../teams/errors'
import { useOwnRegistration, useTeamMutations } from '../../teams/hooks/useTeams'
import { AccountStep } from '../components/AccountStep'
import { AvailabilityStep } from '../components/AvailabilityStep'
import { BuyInStep } from '../components/BuyInStep'
import { JoinStep } from '../components/JoinStep'
import { RulesStep } from '../components/RulesStep'
import { JOINED_STATE, STEP_COUNT, canSend, stepDone, type JoinForm } from '../state'

/** Join a draft event with a profile account (feature 022, join-desktop / join-mobile). */
export function JoinEventPage() {
  const { t } = useTranslation()
  const { eventId = '' } = useParams()
  const session = useSession()
  const events = useEvents()
  const event = events.data?.find((candidate) => candidate.id === eventId) ?? null
  const signedIn = Boolean(session.data)
  const registration = useOwnRegistration(eventId, session.data?.id)
  const profile = useProfile(signedIn)

  let content: ReactNode
  if (
    session.isLoading ||
    events.isLoading ||
    (signedIn && (registration.isLoading || profile.isLoading))
  )
    content = (
      <p role="status" className="text-rs-muted">
        {t('common.loading')}
      </p>
    )
  else if (!signedIn)
    content = (
      <InfoBanner>
        {t('join.blocked.login')}{' '}
        <Link to="/login" className="font-semibold text-rs-gold-bright">
          {t('auth.login')}
        </Link>
      </InfoBanner>
    )
  else if (events.isError || registration.isError || profile.isError || !profile.data)
    content = <p role="alert">{t('common.apiError')}</p>
  else if (!event) content = <Blocked text={t('join.blocked.notFound')} />
  else if (event.status !== 'draft') content = <Blocked text={t('join.blocked.closed')} />
  else if (registration.data) content = <Blocked text={t('join.blocked.registered')} />
  else content = <JoinFlow event={event} profile={profile.data} />

  return (
    <AppShell desktopPadding="md:px-8 md:pt-[26px]">
      <div className="mx-auto flex max-w-[820px] flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Link
            to="/events"
            className="inline-flex min-h-9 items-center gap-0.5 self-start text-sm text-rs-gold-bright"
          >
            <ChevronLeftOutlinedIcon fontSize="small" aria-hidden="true" />
            {t('navigation.events')}
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-rs-gold md:text-xs">
            {t('join.eyebrow')}
          </span>
          <h1 className="m-0 font-display text-[24px] font-bold leading-[1.15] text-rs-gold-bright md:text-[30px]">
            {event?.name ?? t('join.eyebrow')}
          </h1>
          {event && (
            <span className="text-rs-muted">
              <EventSchedule event={event} />
              {event.status === 'draft' && ` · ${t('join.open')}`}
            </span>
          )}
        </div>
        {content}
      </div>
    </AppShell>
  )
}

function Blocked({ text }: { text: string }) {
  const { t } = useTranslation()
  return (
    <InfoBanner>
      {text}{' '}
      <Link to="/events" className="font-semibold text-rs-gold-bright">
        {t('join.backToEvents')}
      </Link>
    </InfoBanner>
  )
}

function initialForm(profile: Profile): JoinForm {
  const usable = profile.accounts.filter(hasWomStats)
  const account = usable.find((item) => item.is_main) ?? usable[0]
  return {
    accountId: account?.id ?? null,
    activity: profile.activity,
    teammates: [],
    agreed: { rules: false, dropAccount: false, team: false },
  }
}

function JoinFlow({ event, profile }: { event: BingoEvent; profile: Profile }) {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const { createPlayer } = useTeamMutations()
  const [form, setForm] = useState(() => initialForm(profile))
  const [step, setStep] = useState(0)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const account = profile.accounts.find((item) => item.id === form.accountId) ?? null
  const ready = canSend(form)

  const send = () => {
    if (!ready || !form.accountId) return
    setErrorKey(null)
    createPlayer.mutate(
      {
        eventId: event.id,
        payload: {
          account_id: form.accountId,
          activity: form.activity,
          teammate_ids: form.teammates.map((member) => member.user_id),
          accept_rules: true,
          accept_drop_account: true,
          accept_team: true,
        },
      },
      {
        onSuccess: () => navigate('/events', { state: { [JOINED_STATE]: event.name } }),
        onError: (error) => setErrorKey(teamErrorKey(error)),
      },
    )
  }

  const reason = !form.accountId
    ? 'join.send.needAccount'
    : !ready
      ? 'join.send.needAgreements'
      : null
  const teammateNames = form.teammates.map((member) => member.main_rsn ?? member.username)
  const steps = [
    {
      title: t('join.account.title'),
      summary: account ? `${account.rsn} · ${t('join.account.foundSummary')}` : undefined,
      action: (
        <Link to="/profile" className="text-[13px] text-rs-gold-bright">
          {t('join.account.manage')}
        </Link>
      ),
      body: (
        <AccountStep
          accounts={profile.accounts}
          value={form.accountId}
          onChange={(accountId) => setForm({ ...form, accountId })}
        />
      ),
    },
    {
      title: t('join.availability.title'),
      summary: [
        form.activity ? t(`join.activity.short.${form.activity}`) : null,
        teammateNames.join(', ') || null,
      ]
        .filter(Boolean)
        .join(' · '),
      body: (
        <AvailabilityStep
          activity={form.activity}
          timezone={profile.timezone}
          teammates={form.teammates}
          onActivityChange={(activity) => setForm({ ...form, activity })}
          onTeammatesChange={(teammates) => setForm({ ...form, teammates })}
        />
      ),
    },
    {
      title: t('join.rules.title'),
      summary: ready ? t('join.rules.confirmed') : undefined,
      body: (
        <RulesStep
          rulesText={event.rules_text ?? null}
          addenda={event.rules_addenda}
          hasBuyIn={Boolean(event.buy_in)}
          rsn={account?.rsn ?? null}
          agreed={form.agreed}
          onAgree={(agreement, value) =>
            setForm({ ...form, agreed: { ...form.agreed, [agreement]: value } })
          }
        />
      ),
    },
    {
      title: t(event.buy_in ? 'join.buyIn.title' : 'join.send.title'),
      summary: event.buy_in ? t('join.buyIn.summary') : t('join.buyIn.none'),
      body: (
        <>
          <BuyInStep buyIn={event.buy_in ?? null} />
          {isDesktop && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                disabled={!ready || createPlayer.isPending}
                aria-describedby="join-send-why"
                onClick={send}
              >
                {t(createPlayer.isPending ? 'common.saving' : 'join.send.button')}
              </Button>
              <span id="join-send-why" className="text-[13px] text-rs-muted">
                {reason && `${t(reason)} `}
                <Trans i18nKey="join.send.pending" components={{ b: <strong /> }} />
              </span>
            </div>
          )}
          {errorKey && (
            <p role="alert" className="m-0 text-sm text-rs-danger-text">
              {t(errorKey)}
            </p>
          )}
        </>
      ),
    },
  ]

  const last = step === STEP_COUNT - 1
  const stepComplete = stepDone(step, form)
  return (
    <div className={`flex flex-col gap-3 md:gap-4 ${isDesktop ? '' : 'pb-[76px]'}`}>
      {!isDesktop && (
        <div
          role="progressbar"
          aria-label={t('join.progress', { step: step + 1, total: STEP_COUNT })}
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          className="grid grid-cols-4 gap-1"
        >
          {steps.map((_, index) => (
            <span
              key={index}
              className={`h-1 rounded-full ${index <= step ? 'bg-rs-gold' : 'bg-rs-border'}`}
            />
          ))}
        </div>
      )}
      {steps.map((item, index) => (
        <JoinStep
          key={index}
          index={index}
          title={item.title}
          accordion={!isDesktop}
          open={isDesktop || index === step}
          done={index < step && stepDone(index, form)}
          summary={item.summary}
          headerAction={item.action}
          onOpen={() => setStep(index)}
        >
          {item.body}
        </JoinStep>
      ))}
      {!isDesktop && (
        <div className="fixed inset-x-0 bottom-[68px] z-20 flex gap-2 border-t border-rs-border bg-rs-inset px-4 pb-4 pt-3">
          <Button
            className="flex-1"
            onClick={() => (step === 0 ? navigate('/events') : setStep(step - 1))}
          >
            {t('join.back')}
          </Button>
          <Button
            variant="primary"
            className="flex-[2]"
            disabled={last ? !ready || createPlayer.isPending : !stepComplete}
            onClick={() => (last ? send() : setStep(step + 1))}
          >
            {last
              ? t(createPlayer.isPending ? 'common.saving' : 'join.send.button')
              : stepComplete
                ? t('join.next')
                : t(step === 0 ? 'join.nextNeedAccount' : 'join.nextNeedAgreements')}
          </Button>
        </div>
      )}
    </div>
  )
}
