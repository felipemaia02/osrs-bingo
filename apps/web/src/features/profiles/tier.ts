/** Progression tier (feature 069), suggested from the main's WOM stats; admins may override. */
export const PROGRESSION_TIERS = ['early', 'mid', 'end'] as const
export type ProgressionTier = (typeof PROGRESSION_TIERS)[number]

export interface TierInfo {
  tier?: ProgressionTier | null
  tier_suggested?: ProgressionTier | null
  tier_overridden?: boolean
}
