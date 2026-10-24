import { useTranslation } from 'react-i18next'
import type { Tile, TileMatch } from '../types'

/** Accessible name: "Alchemical Hydra, row 1 column 3, Hard, 20 points, matches search: …". */
export function useTileLabel(tile: Tile, match?: TileMatch): string {
  const { t } = useTranslation()
  const base = t(tile.bonus ? 'tile.bonusLabel' : 'tile.label', {
    name: tile.name,
    row: tile.row,
    column: tile.col,
    tier: t(`tile.tier.${tile.tier}`),
    points: tile.points,
  })
  const progress = tile.progress
    ? `, ${
        tile.progress.complete
          ? t('score.labelComplete')
          : t('score.labelProgress', {
              value: tile.progress.value,
              requirement: tile.progress.requirement,
            })
      }`
    : ''
  if (!match) return base + progress
  if (!match.matches) return `${base}${progress}, ${t('board.match.none')}`
  if (!match.matchedDrop) return `${base}${progress}, ${t('board.match.tile')}`
  return `${base}${progress}, ${t('board.match.drop', {
    drop: `${match.matchedDrop.name} +${match.matchedDrop.progressWeight}`,
  })}`
}
