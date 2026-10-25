import { useTranslation } from 'react-i18next'
import { bonusIndexOf, columnOf, isBonusPosition, rowOf } from '../draft'

/** "2·5" for grid positions, "Bonus 2" for bonus-row slots (feature 020). */
export function usePositionLabel(size: number): (position: number) => string {
  const { t } = useTranslation()
  return (position) =>
    isBonusPosition(position, size)
      ? t('boards.bonusRow.cell', { slot: bonusIndexOf(position, size) })
      : `${rowOf(position, size)}·${columnOf(position, size)}`
}
