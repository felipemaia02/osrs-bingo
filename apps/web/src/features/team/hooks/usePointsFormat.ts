import { useTranslation } from 'react-i18next'

const POINT_DECIMALS = 2

/** Points with up to two decimals in the current language (shares can be fractions). */
export function usePointsFormat() {
  const { i18n } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: POINT_DECIMALS })
  return (points: number) => format.format(points)
}
