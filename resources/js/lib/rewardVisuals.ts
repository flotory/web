export type RewardCategory = 'free_item' | 'discount' | 'vip' | 'dessert' | 'drink' | 'special_reward'

export function rewardCategoryFromTitle(title: string): RewardCategory {
  const normalized = title.toLowerCase()
  if (normalized.includes('%') || normalized.includes('off') || normalized.includes('discount')) {
    return 'discount'
  }
  if (normalized.includes('vip') || normalized.includes('exclusive')) {
    return 'vip'
  }
  if (normalized.includes('dessert') || normalized.includes('cake') || normalized.includes('sweet')) {
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

export function rewardFallbackStyle(title: string): string {
  const category = rewardCategoryFromTitle(title)
  if (category === 'discount') {
    return 'bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-500'
  }
  if (category === 'vip' || category === 'special_reward') {
    return 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500'
  }
  if (category === 'dessert') {
    return 'bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600'
  }
  if (category === 'drink') {
    return 'bg-gradient-to-br from-cyan-600 via-teal-500 to-emerald-500'
  }
  return 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-500'
}

export function rewardIcon(title: string): string {
  const normalized = title.toLowerCase()
  if (normalized.includes('coffee')) return '☕'
  if (normalized.includes('dessert') || normalized.includes('cake')) return '🍰'
  if (normalized.includes('cocktail')) return '🍸'
  if (normalized.includes('pizza')) return '🍕'
  if (normalized.includes('burger')) return '🍔'
  if (normalized.includes('%') || normalized.includes('off')) return '🏷'
  if (normalized.includes('vip')) return '✨'
  if (normalized.includes('beer') || normalized.includes('wine')) return '🍷'
  return '★'
}
