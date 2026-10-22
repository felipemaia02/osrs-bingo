/** Lowercases and strips accents so "Tumékén" matches "tumeken". */
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase().trim()
}
