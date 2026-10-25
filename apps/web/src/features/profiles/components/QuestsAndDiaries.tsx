import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import { useTranslation } from 'react-i18next'
import { useStatFormat } from '../hooks/useStatFormat'
import type { WikiSync } from '../types'

/**
 * Quest points, quests and achievement diaries from WikiSync (feature 034), for team balance.
 * Hard (and Elite) complete regions are highlighted.
 */
export function QuestsAndDiaries({ data }: { data: WikiSync | null | undefined }) {
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
          <dl className="m-0 grid grid-cols-3 gap-1.5">
            {(
              [
                [t('profile.wikisync.questPoints'), format.whole(data.quest_points ?? null)],
                [
                  t('profile.wikisync.quests'),
                  `${format.whole(data.quests_completed ?? null)}/${format.whole(data.quests_total ?? null)}`,
                ],
                [
                  t('profile.wikisync.hardDiaries'),
                  `${format.whole(data.hard_diaries ?? null)}/${data.diaries.length}`,
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
          <ul
            aria-label={t('profile.wikisync.regions')}
            className="m-0 flex list-none flex-wrap gap-1 p-0"
          >
            {data.diaries.map((region) => (
              <li
                key={region.region}
                title={t(
                  region.elite
                    ? 'profile.wikisync.eliteDone'
                    : region.hard
                      ? 'profile.wikisync.hardDone'
                      : 'profile.wikisync.hardMissing',
                  { region: region.region },
                )}
                className={`inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-px text-[11px] ${
                  region.hard
                    ? 'border-rs-success/70 bg-rs-success-bg text-rs-success-text'
                    : 'border-rs-border/50 text-rs-muted'
                }`}
              >
                {region.hard && <CheckOutlinedIcon sx={{ fontSize: 12 }} aria-hidden="true" />}
                {region.region}
                {region.elite && (
                  <span className="font-semibold">· {t('profile.wikisync.elite')}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <span className="text-[11px] text-rs-muted">{t('profile.wikisync.source')}</span>
    </section>
  )
}

/** One line for draft cards: "QP 343 · Hard diaries 8/12". */
export function QuestsAndDiariesLine({ data }: { data: WikiSync | null | undefined }) {
  const { t } = useTranslation()
  const format = useStatFormat()
  if (!data || data.status !== 'found')
    return <span className="text-xs text-rs-muted">{t('profile.wikisync.noDataShort')}</span>
  return (
    <span className="flex gap-3 text-xs">
      <span>
        {t('profile.wikisync.qp')}{' '}
        <strong className="tabular-nums text-rs-gold-bright">
          {format.whole(data.quest_points ?? null)}
        </strong>
      </span>
      <span>
        {t('profile.wikisync.hardDiaries')}{' '}
        <strong className="tabular-nums text-rs-gold-bright">
          {format.whole(data.hard_diaries ?? null)}/{data.diaries.length}
        </strong>
      </span>
    </span>
  )
}
