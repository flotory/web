export type RewardCategory = 'free_item' | 'discount' | 'vip' | 'dessert' | 'drink' | 'special_reward'

export function rewardCategoryFromTitle(title: string): RewardCategory {
  const normalized = title.toLowerCase()
  if (normalized.includes('%') || normalized.includes('off') || normalized.includes('discount')) {
    return 'discount'
  }
  if (normalized.includes('vip') || normalized.includes('exclusive')) {
    return 'vip'
  }
  if (normalized.includes('dessert') || normalized.includes('cake') || normalized.includes('sweet') || normalized.includes('pastry')) {
    return 'dessert'
  }
  if (normalized.includes('ice cream') || normalized.includes('icecream')) {
    return 'dessert'
  }
  if (
    normalized.includes('cocktail') ||
    normalized.includes('drink') ||
    normalized.includes('beer') ||
    normalized.includes('wine') ||
    normalized.includes('coffee')
  ) {
    return 'drink'
  }
  if (normalized.includes('gift') || normalized.includes('special')) {
    return 'special_reward'
  }
  return 'free_item'
}

export function rewardCategoryLabel(category: RewardCategory): string {
  const labels: Record<RewardCategory, string> = {
    free_item: 'Free item',
    discount: 'Discount',
    vip: 'VIP',
    dessert: 'Dessert',
    drink: 'Drink',
    special_reward: 'Special',
  }
  return labels[category]
}
