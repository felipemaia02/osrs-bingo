const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
export const ACCEPTED_SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** The translation key of what's wrong with a picked file, or null when it can be sent. */
export function screenshotFileError(file: File): string | null {
  if (!ACCEPTED_SCREENSHOT_TYPES.includes(file.type)) return 'submissions.errors.imageType'
  if (file.size > MAX_SCREENSHOT_BYTES) return 'submissions.errors.imageSize'
  return null
}
