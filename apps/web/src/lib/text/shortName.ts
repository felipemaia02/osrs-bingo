const SHORT_WORD = 3
const LEADING_ARTICLE = /^the\s+/i

/**
 * Compact tile name for the mobile mini-map (feature 025): "Moons of Peril" → "Moons",
 * "The Gauntlet" → "Gauntlet", "DT2 Bosses" → "DT2 Bosses" (a short first word keeps the next).
 */
export function shortNameOf(name: string): string {
  const words = name.trim().replace(LEADING_ARTICLE, '').split(/\s+/)
  return words[0].length <= SHORT_WORD && words.length > 1 ? `${words[0]} ${words[1]}` : words[0]
}
