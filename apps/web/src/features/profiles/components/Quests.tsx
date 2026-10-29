import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import { useTranslation } from 'react-i18next'
import { useStatFormat } from '../hooks/useStatFormat'
import type { KeyQuest, WikiSync } from '../types'

function doneCount(quests: KeyQuest[]): number {
  return quests.filter((quest) => quest.done).length
}

/** Quest points, quest count and the key quests from WikiSync (features 034 and 045), for team balance. */
export function Quests({ data }: { data: WikiSync | null | undefined }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  const message = !data
    ? t('profile.wikisync.notLoaded')
    : data.status === 'not_found'
      ? t('profile.wikisync.notFound')
      : data.status === 'unavailable'
        ? t('profile.wikisync.unavailable')
        : null
  return (
    <section
      aria-label={t('profile.wikisync.title')}
      className="flex flex-col gap-2 rounded-[3px] border border-rs-border/40 bg-rs-inset p-2.5"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-rs-muted">
        {t('profile.wikisync.title')}
      </span>
      {message || !data ? (
        <span className="text-[13px] text-rs-muted">{message}</span>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-2 gap-1.5">
            {(
              [
                [t('profile.wikisync.questPoints'), format.whole(data.quest_points ?? null)],
                [
                  t('profile.wikisync.quests'),
                  `${format.whole(data.quests_completed ?? null)}/${format.whole(data.quests_total ?? null)}`,
                ],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col">
                <dt className="truncate text-[11px] text-rs-muted">{label}</dt>
                <dd className="m-0 text-[15px] font-bold tabular-nums text-rs-gold-bright">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {data.key_quests ? (
            <ul
              aria-label={t('profile.wikisync.keyQuests')}
              className="m-0 flex list-none flex-wrap gap-1 p-0"
            >
              {data.key_quests.map((quest) => (
                <li
                  key={quest.code}
                  title={t(
                    quest.done ? 'profile.wikisync.questDone' : 'profile.wikisync.questMissing',
                    { quest: quest.name },
                  )}
                  className={`inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-px text-[11px] ${
                    quest.done
                      ? 'border-rs-success/70 bg-rs-success-bg text-rs-success-text'
                      : 'border-rs-border/50 text-rs-muted'
                  }`}
                >
                  {quest.done && <CheckOutlinedIcon sx={{ fontSize: 12 }} aria-hidden="true" />}
                  {quest.code}
                  <span className="sr-only">
                    {` ${t(quest.done ? 'profile.wikisync.done' : 'profile.wikisync.missing')}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-[13px] text-rs-muted">
              {t('profile.wikisync.keyQuestsNotLoaded')}
            </span>
          )}
        </>
      )}
      <span className="text-[11px] text-rs-muted">{t('profile.wikisync.source')}</span>
    </section>
  )
}

/** One line for draft cards: "QP 343 · Key quests 4/6". */
export function QuestsLine({ data }: { data: WikiSync | null | undefined }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  if (!data || data.status !== 'found')
    return <span className="text-xs text-rs-muted">{t('profile.wikisync.noDataShort')}</span>
  const keyQuests = data.key_quests
  return (
    <span className="flex gap-3 text-xs">
      <span>
        {t('profile.wikisync.qp')}{' '}
        <strong className="tabular-nums text-rs-gold-bright">
          {format.whole(data.quest_points ?? null)}
        </strong>
      </span>
      {keyQuests && (
        <span
          title={keyQuests
            .filter((quest) => quest.done)
            .map((quest) => quest.code)
            .join(' · ')}
        >
          {t('profile.wikisync.keyQuests')}{' '}
          <strong className="tabular-nums text-rs-gold-bright">
            {doneCount(keyQuests)}/{keyQuests.length}
          </strong>
        </span>
      )}
    </span>
  )
}
