import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/common/AppShell'
import { BingoBoard } from '../components/BingoBoard'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <AppShell>
      <div className="mx-auto max-w-[96rem]">
        <div className="mb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rs-gold">
            {t('board.eyebrow')}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-rs-text sm:text-3xl">
                {t('board.title')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-rs-muted">{t('board.description')}</p>
            </div>
            <p className="rounded-sm border border-rs-border/60 bg-rs-surface px-3 py-1.5 text-xs text-rs-muted">
              {t('board.prototypeData')}
            </p>
          </div>
        </div>
        <BingoBoard />
      </div>
    </AppShell>
  )
}
