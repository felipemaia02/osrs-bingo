import { useTranslation } from 'react-i18next'
import type { Player } from '../types'

/** "Oct 21, 6:02 PM" in the viewer's language; "—" when the API didn't send the time. */
export function useRequestedFormat(): (player: Player) => string {
  const { i18n } = useTranslation()
  const format = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return (player) => (player.created_at ? format.format(Date.parse(player.created_at)) : '—')
}
