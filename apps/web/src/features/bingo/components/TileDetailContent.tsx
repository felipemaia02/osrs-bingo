import HourglassDisabledOutlinedIcon from '@mui/icons-material/HourglassDisabledOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { Trans, useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { TIER_TONE } from '../tierTone'
import type { Tile, TileMatch } from '../types'
import { CardImage } from '../../../components/ui/CardImage'
import { TileProgressLine } from './TileProgressLine'

interface TileDetailContentProps {
  tile: Tile
  match?: TileMatch
  /** The dialog already shows the name as its title. */
  /** i18n key: why team progress can't be shown (feature 025). */
  unavailableReason: string
}

/** Read-only tile rules (board-a-desktop detail panel). Drop weights are progress, never points. */
export function TileDetailContent({ tile, match, unavailableReason }: TileDetailContentProps) {
  const { t, i18n } = useTranslation()
  const highlighted = match?.matches ? match.matchedDrop?.name : undefined

  return (
    <>
      <CardImage
        name={tile.name}
        imageUrl={tile.imageUrl}
        className="h-[150px] w-full rounded-none"
        large
      />
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={TIER_TONE[tile.tier]}>{t(`tile.tier.${tile.tier}`)}</Badge>
            <Badge tone="neutral">{t('tile.points', { count: tile.points })}</Badge>
            <Badge tone="neutral">{t(`cards.kind.${tile.kind}`)}</Badge>
            {tile.bonus && <Badge tone="gold">★ {t('board.bonus.card')}</Badge>}
            {tile.requiresPreverification && (
              <Badge tone="info">{t('cards.preverification')}</Badge>
            )}
          </div>
        </div>
        {tile.lastUpdate && (
          <p
            role="note"
            className="m-0 rounded-[3px] border border-rs-border-strong bg-rs-warning-bg px-3 py-2 text-[13px]"
          >
            {t('board.panel.updated', {
              date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
                new Date(tile.lastUpdate.at),
              ),
              reason: tile.lastUpdate.reason,
            })}
          </p>
        )}
        <p className="m-0 rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2.5 text-[13px]">
          <Trans
            i18nKey="board.panel.completes"
            values={{ requirement: tile.requirement, points: tile.points }}
            components={{ strong: <strong /> }}
          />
        </p>
        {tile.progress ? (
          <div className="flex flex-col gap-1.5 rounded-[3px] border border-rs-border/60 bg-rs-inset px-3 py-2.5">
            <strong className="text-[13px]">
              {t('score.detailProgress', {
                value: tile.progress.value,
                requirement: tile.progress.requirement,
                points: tile.points,
              })}
            </strong>
            <TileProgressLine progress={tile.progress} />
            {tile.progress.drops.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-xs">
                {tile.progress.drops.map((drop) => (
                  <li key={drop.name} className="flex justify-between gap-2">
                    <span>{t('score.dropCount', { name: drop.name, count: drop.count })}</span>
                    <span className="font-semibold text-rs-gold-bright">+{drop.progress}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="m-0 flex items-center gap-2 text-[13px]">
            <HourglassDisabledOutlinedIcon
              fontSize="small"
              className="text-rs-muted"
              aria-hidden="true"
            />
            <span className="text-rs-muted">{t(unavailableReason)}</span>
          </p>
        )}
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <strong className="text-[13px]">
              {t('board.panel.drops', { count: tile.drops.length })}
            </strong>
            <span className="text-xs text-rs-muted">{t('board.panel.weightHint')}</span>
          </div>
          <ul className="m-0 list-none rounded-[3px] border border-rs-border/60 p-0">
            {tile.drops.map((drop) => {
              const matched = drop.name === highlighted
              return (
                <li
                  key={drop.key}
                  className={`border-b border-rs-border/45 px-2.5 py-[9px] last:border-b-0 ${
                    matched
                      ? 'bg-rs-raised shadow-[inset_3px_0_0_theme(colors.rs.gold-bright)]'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      {matched && (
                        <SearchOutlinedIcon
                          sx={{ fontSize: 16 }}
                          className="text-rs-gold-bright"
                          aria-hidden="true"
                        />
                      )}
                      {matched ? <strong>{drop.name}</strong> : drop.name}
                    </span>
                    <span className="whitespace-nowrap text-xs font-semibold text-rs-gold-bright">
                      {t('cards.rules.progress', { count: drop.progress_weight })}
                    </span>
                  </div>
                  {drop.verification_note && (
                    <p className="m-0 mt-1 text-xs text-rs-muted">
                      {t('cards.rules.verification', { note: drop.verification_note })}
                    </p>
                  )}
                  {drop.counting_restriction && (
                    <p className="m-0 mt-1 text-xs text-rs-muted">
                      {t('cards.rules.restriction', { note: drop.counting_restriction })}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        {tile.requiresPreverification && tile.ruleNote && (
          <p className="m-0 rounded-[3px] border border-rs-info bg-rs-info-bg px-3 py-2 text-xs text-rs-info-banner-text">
            <strong>{t('cards.preverification')}:</strong> {tile.ruleNote}
          </p>
        )}
        {tile.imageArtist && (
          <span className="text-xs text-rs-muted">
            {t('cards.artwork.credit', { artist: tile.imageArtist })}
          </span>
        )}
        {tile.imageSourceUrl && (
          <a
            href={tile.imageSourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-rs-gold-bright hover:text-rs-gold-hover"
          >
            {t('board.panel.imageSource', { name: tile.name })}
            <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
          </a>
        )}
      </div>
    </>
  )
}
