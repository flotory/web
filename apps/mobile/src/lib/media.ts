import { API_BASE_URL } from './config'

const assetOrigin = API_BASE_URL.replace(/\/api\/?$/, '')

export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path || !path.trim()) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/')) return `${assetOrigin}${path}`
  return `${assetOrigin}/${path}`
}

type VenueCategory = 'cafe' | 'restaurant' | 'bar' | 'bakery'

const VENUE_COVER_DEFAULTS: Record<VenueCategory, string[]> = {
  cafe: [
    '/images/defaults/photo-1554118811-1e0d58224f24-1400x700.jpg',
    '/images/defaults/photo-1495474472287-4d71bcdd2085-1400x700.jpg',
    '/images/defaults/photo-1501339847302-ac426a4a7cbb-1400x700.jpg',
  ],
  bar: [
    '/images/defaults/photo-1776763019214-9658490d8b65-1400x700.jpg',
    '/images/defaults/photo-1514933651103-005eec06c04b-1400x700.jpg',
    '/images/defaults/photo-1470337458703-46ad1756a187-1400x700.jpg',
  ],
  restaurant: [
    '/images/defaults/photo-1517248135467-4c7edcad34c4-1400x700.jpg',
    '/images/defaults/photo-1414235077428-338989a2e8c0-1400x700.jpg',
    '/images/defaults/photo-1546069901-ba9599a7e63c-1400x700.jpg',
  ],
  bakery: [
    '/images/defaults/photo-1711672284661-bd70e38f31b2-1400x700.jpg',
    '/images/defaults/photo-1509440159596-0249088772ff-1400x700.jpg',
    '/images/defaults/photo-1555507036-ab1f4038808a-1400x700.jpg',
  ],
}

const VENUE_LOGO_DEFAULTS: Record<VenueCategory, string[]> = {
  cafe: [
    '/images/defaults/photo-1501339847302-ac426a4a7cbb-512x512.jpg',
    '/images/defaults/photo-1495474472287-4d71bcdd2085-512x512.jpg',
  ],
  bar: [
    '/images/defaults/photo-1470337458703-46ad1756a187-512x512.jpg',
    '/images/defaults/photo-1514933651103-005eec06c04b-512x512.jpg',
  ],
  restaurant: [
    '/images/defaults/photo-1414235077428-338989a2e8c0-512x512.jpg',
    '/images/defaults/photo-1546069901-ba9599a7e63c-512x512.jpg',
  ],
  bakery: [
    '/images/defaults/photo-1509440159596-0249088772ff-512x512.jpg',
    '/images/defaults/photo-1555507036-ab1f4038808a-512x512.jpg',
  ],
}

const REWARD_DEFAULTS = {
  drink: '/images/defaults/photo-1509042239860-f550ce710b93-800x600.jpg',
  dessert: '/images/defaults/photo-1551024506-0bccd828d307-800x600.jpg',
  free_item: '/images/defaults/photo-1504674900247-0877df9cc836-800x600.jpg',
  discount: '/images/defaults/photo-1555396273-367ea4eb4db5-800x600.jpg',
  special: '/images/defaults/photo-1501339847302-ac426a4a7cbb-800x600.jpg',
} as const

function normalizeCategory(category: string | null | undefined): VenueCategory {
  if (category === 'restaurant' || category === 'bar' || category === 'bakery' || category === 'cafe') {
    return category
  }
  return 'cafe'
}

function hashSeed(seed: string): number {
  let hash = 5381
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i)
  }
  return Math.abs(hash)
}

function pickStable(list: string[], seed: string): string {
  return list[hashSeed(seed) % list.length] ?? list[0]
}

export function venueCoverUrl(venue?: { cover_image?: string | null; category?: string | null; name?: string | null }) {
  const uploaded = resolveMediaUrl(venue?.cover_image)
  if (uploaded) return uploaded
  const category = normalizeCategory(venue?.category)
  return resolveMediaUrl(pickStable(VENUE_COVER_DEFAULTS[category], venue?.name ?? category))
}

export function venueLogoUrl(venue?: { logo?: string | null; logo_thumb?: string | null; category?: string | null; name?: string | null }) {
  const uploaded = resolveMediaUrl(venue?.logo_thumb ?? venue?.logo)
  if (uploaded) return uploaded
  const category = normalizeCategory(venue?.category)
  return resolveMediaUrl(pickStable(VENUE_LOGO_DEFAULTS[category], venue?.name ?? category))
}

export function rewardImageUrl(reward?: { image?: string | null; image_thumb?: string | null; title?: string | null }) {
  const uploaded = resolveMediaUrl(reward?.image ?? reward?.image_thumb)
  if (uploaded) return uploaded
  const title = (reward?.title ?? '').toLowerCase()
  if (title.includes('coffee') || title.includes('drink')) return resolveMediaUrl(REWARD_DEFAULTS.drink)
  if (title.includes('dessert') || title.includes('cake') || title.includes('pastry')) return resolveMediaUrl(REWARD_DEFAULTS.dessert)
  if (title.includes('%') || title.includes('discount') || title.includes('off')) return resolveMediaUrl(REWARD_DEFAULTS.discount)
  if (title.includes('free')) return resolveMediaUrl(REWARD_DEFAULTS.free_item)
  return resolveMediaUrl(REWARD_DEFAULTS.special)
}
