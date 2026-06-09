import type { StampAddedPayload } from '@/types'

export function stampBannerCopy(payload: StampAddedPayload): { title: string; subtitle: string } {
  const venue = payload.venue.name ?? 'your venue'
  const count = payload.added_stamps

  if (payload.cycle_completed) {
    return { title: 'Cycle complete!', subtitle: venue }
  }

  return {
    title: count === 1 ? '+1 stamp added' : `+${count} stamps added`,
    subtitle: venue,
  }
}
