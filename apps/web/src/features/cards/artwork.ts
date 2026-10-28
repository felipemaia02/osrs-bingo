import { apiClient } from '../../lib/api'
import type { CardArtwork, WikiImage } from './types'

const ARTWORK_PREFIX = 'cards/artwork/'

/** Public URL of uploaded card artwork (feature 041). */
export function artworkUrl(key: string): string {
  return `${apiClient.defaults.baseURL}/card-artwork/${key.replace(ARTWORK_PREFIX, '')}`
}

/** The card picture: clan artwork first, then the OSRS Wiki image, else none (fallback). */
export function cardImageUrl(card: {
  artwork?: CardArtwork | null
  wiki_image?: WikiImage | null
}): string | null {
  if (card.artwork) return artworkUrl(card.artwork.key)
  return card.wiki_image?.image_url ?? null
}
