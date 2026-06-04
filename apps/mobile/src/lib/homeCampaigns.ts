import type { HomeCampaign } from '../types/loyalty'

/** Active-for-you promotions first, then highest multiplier, soonest ending. */
export function sortHomeCampaigns(campaigns: HomeCampaign[]): HomeCampaign[] {
  return [...campaigns].sort((a, b) => {
    if (a.applies_now !== b.applies_now) {
      return a.applies_now ? -1 : 1
    }

    if (a.multiplier !== b.multiplier) {
      return b.multiplier - a.multiplier
    }

    const daysA = a.days_left ?? 9999
    const daysB = b.days_left ?? 9999

    return daysA - daysB
  })
}
