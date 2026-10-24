/** IANA time zones from the browser, grouped by area, with their current UTC offset. */
export interface TimezoneOption {
  id: string
  label: string
}

export interface TimezoneGroup {
  area: string
  zones: TimezoneOption[]
}

const UTC_ZONE = 'UTC'

/** `Intl.supportedValuesOf` (ES2022) isn't in the project's TS lib; old browsers lack it. */
function supportedTimezones(): string[] {
  const intl = Intl as { supportedValuesOf?: (key: 'timeZone') => string[] }
  return intl.supportedValuesOf?.('timeZone') ?? []
}

export function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/** "UTC−03:00" for America/Sao_Paulo (current offset, daylight saving included). */
export function utcOffset(zone: string, at = new Date()): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((part) => part.type === 'timeZoneName')?.value
  const offset = name?.replace('GMT', '') || '+00:00'
  return `UTC${offset.replace('-', '−')}`
}

function cityOf(zone: string): string {
  return zone.split('/').slice(1).join(' / ').replace(/_/g, ' ') || zone
}

export function timezoneGroups(saved: string | null, at = new Date()): TimezoneGroup[] {
  const zones = new Set<string>(supportedTimezones())
  zones.add(UTC_ZONE)
  if (saved) zones.add(saved)
  const groups = new Map<string, TimezoneOption[]>()
  for (const zone of [...zones].sort()) {
    const area = zone.includes('/') ? zone.split('/')[0] : UTC_ZONE
    const options = groups.get(area) ?? []
    options.push({ id: zone, label: `${cityOf(zone)} (${utcOffset(zone, at)})` })
    groups.set(area, options)
  }
  return [...groups].map(([area, options]) => ({ area, zones: options }))
}

export const REGIONS = ['americas', 'europe', 'africa', 'asia', 'oceania'] as const
export type Region = (typeof REGIONS)[number]

const AREA_REGION: Record<string, Region> = {
  America: 'americas',
  Europe: 'europe',
  Atlantic: 'europe',
  Africa: 'africa',
  Asia: 'asia',
  Indian: 'asia',
  Australia: 'oceania',
  Pacific: 'oceania',
}

/** Continent of an IANA zone (America/Sao_Paulo → americas); null for UTC and the like. */
export function regionOf(zone: string | null | undefined): Region | null {
  return zone ? (AREA_REGION[zone.split('/')[0]] ?? null) : null
}

/** "Sao Paulo (UTC−03:00)" for a zone; the zone itself when the browser doesn't know it. */
export function zoneLabel(zone: string, at = new Date()): string {
  try {
    return `${cityOf(zone)} (${utcOffset(zone, at)})`
  } catch {
    return zone
  }
}
