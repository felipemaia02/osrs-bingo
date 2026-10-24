import type { LinkedAccount } from './types'

/** Same rule as the API: WOM stats stored and not marked not found (features 021, 022). */
export function hasWomStats(account: LinkedAccount): boolean {
  return account.wom_status !== 'not_found' && account.boss_kc !== null
}
