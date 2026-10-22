const MAX_INITIALS = 3

/** "Alchemical Hydra" → "AH", "DT2 Bosses" → "DB": shown when a card has no image. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Z0-9]/.test(word))
    .map((word) => word[0])
    .join('')
    .slice(0, MAX_INITIALS)
}
