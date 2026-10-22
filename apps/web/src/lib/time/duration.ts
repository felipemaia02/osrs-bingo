export const MINUTE_MS = 60_000
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS

export interface DurationParts {
  days: number
  hours: number
  minutes: number
}

/** Splits a positive duration into whole days, hours and minutes (minutes rounded up). */
export function splitDuration(ms: number): DurationParts {
  const totalMinutes = Math.max(1, Math.ceil(ms / MINUTE_MS))
  return {
    days: Math.floor(totalMinutes / (24 * 60)),
    hours: Math.floor((totalMinutes % (24 * 60)) / 60),
    minutes: totalMinutes % 60,
  }
}
