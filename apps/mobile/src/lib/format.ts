export function greetingForHour(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'Last week'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const VENUE_CATEGORY_LABELS: Record<string, string> = {
  cafe: 'Coffee & Bakery',
  restaurant: 'Restaurant',
  bar: 'Bar & Lounge',
  bakery: 'Bakery',
}

export function formatVenueCategoryLabel(category: string | null | undefined): string {
  if (!category) return 'Loyalty'
  const key = category.toLowerCase()
  if (VENUE_CATEGORY_LABELS[key]) return VENUE_CATEGORY_LABELS[key]
  return category.charAt(0).toUpperCase() + category.slice(1)
}
