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

/** Common zones offered first, with country names to search by (feature 043). */
export const COMMON_TIMEZONES: Array<{ id: string; countries: string[] }> = [
  { id: 'America/Los_Angeles', countries: ['United States', 'USA', 'Estados Unidos', 'Pacific'] },
  { id: 'America/Denver', countries: ['United States', 'USA', 'Estados Unidos', 'Mountain'] },
  { id: 'America/Chicago', countries: ['United States', 'USA', 'Estados Unidos', 'Central'] },
  { id: 'America/New_York', countries: ['United States', 'USA', 'Estados Unidos', 'Eastern'] },
  { id: 'America/Toronto', countries: ['Canada', 'Canadá'] },
  { id: 'America/Mexico_City', countries: ['Mexico', 'México'] },
  { id: 'America/Bogota', countries: ['Colombia', 'Colômbia'] },
  { id: 'America/Santiago', countries: ['Chile'] },
  { id: 'America/Sao_Paulo', countries: ['Brazil', 'Brasil'] },
  { id: 'America/Argentina/Buenos_Aires', countries: ['Argentina'] },
  {
    id: 'Europe/London',
    countries: ['United Kingdom', 'UK', 'England', 'Reino Unido', 'Inglaterra'],
  },
  { id: 'Europe/Dublin', countries: ['Ireland', 'Irlanda'] },
  { id: 'Europe/Lisbon', countries: ['Portugal'] },
  { id: 'Europe/Madrid', countries: ['Spain', 'Espanha', 'España'] },
  { id: 'Europe/Paris', countries: ['France', 'França', 'Francia'] },
  { id: 'Europe/Amsterdam', countries: ['Netherlands', 'Holland', 'Holanda', 'Países Bajos'] },
  { id: 'Europe/Berlin', countries: ['Germany', 'Alemanha', 'Alemania'] },
  { id: 'Europe/Stockholm', countries: ['Sweden', 'Suécia', 'Suecia'] },
  { id: 'Europe/Warsaw', countries: ['Poland', 'Polônia', 'Polonia'] },
  { id: 'Europe/Helsinki', countries: ['Finland', 'Finlândia', 'Finlandia'] },
  { id: 'Europe/Athens', countries: ['Greece', 'Grécia', 'Grecia'] },
  { id: 'Africa/Johannesburg', countries: ['South Africa', 'África do Sul', 'Sudáfrica'] },
  { id: 'Asia/Dubai', countries: ['United Arab Emirates', 'UAE', 'Emirados Árabes'] },
  { id: 'Asia/Kolkata', countries: ['India', 'Índia'] },
  { id: 'Asia/Singapore', countries: ['Singapore', 'Singapura', 'Singapur'] },
  { id: 'Asia/Manila', countries: ['Philippines', 'Filipinas'] },
  { id: 'Asia/Tokyo', countries: ['Japan', 'Japão', 'Japón'] },
  { id: 'Australia/Perth', countries: ['Australia', 'Austrália', 'Western Australia'] },
  { id: 'Australia/Sydney', countries: ['Australia', 'Austrália'] },
  { id: 'Pacific/Auckland', countries: ['New Zealand', 'Nova Zelândia', 'Nueva Zelanda'] },
]

function fold(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[_/]/g, ' ')
}

/** "-3", "utc+1", "GMT+5:30" → minutes from UTC; null when the text isn't an offset. */
export function offsetMinutes(text: string): number | null {
  const match = /^(?:utc|gmt)?\s*([+\-−])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec(text.trim())
  if (!match) return null
  const sign = match[1] === '+' ? 1 : -1
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0))
}

function zoneOffsetMinutes(zone: string, at: Date): number {
  return offsetMinutes(utcOffset(zone, at).replace('UTC', '')) ?? 0
}

/** Zones matching a city, country or UTC offset; the common ones first (feature 043). */
export function searchTimezones(query: string, at = new Date()): TimezoneOption[] {
  const text = fold(query.trim())
  if (!text) return []
  const offset = offsetMinutes(query)
  const countries = new Map(COMMON_TIMEZONES.map((zone) => [zone.id, zone.countries]))
  const zones = [...new Set([...COMMON_TIMEZONES.map((zone) => zone.id), ...supportedTimezones()])]
  return zones
    .filter((zone) =>
      offset !== null
        ? zoneOffsetMinutes(zone, at) === offset
        : [zone, ...(countries.get(zone) ?? [])].some((label) => fold(label).includes(text)),
    )
    .map((zone) => ({ id: zone, label: zoneLabel(zone, at) }))
}

/** The common zones as options, in list order. */
export function commonTimezones(at = new Date()): TimezoneOption[] {
  return COMMON_TIMEZONES.map((zone) => ({ id: zone.id, label: zoneLabel(zone.id, at) }))
}
