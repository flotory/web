export type GreetingKey = 'home.goodMorning' | 'home.goodAfternoon' | 'home.goodEvening'

export function greetingKeyForHour(date = new Date()): GreetingKey {
  const hour = date.getHours()
  if (hour < 12) return 'home.goodMorning'
  if (hour < 17) return 'home.goodAfternoon'
  return 'home.goodEvening'
}

export function greetingForHour(date = new Date()): string {
  const key = greetingKeyForHour(date)
  if (key === 'home.goodMorning') return 'Good morning'
  if (key === 'home.goodAfternoon') return 'Good afternoon'
  return 'Good evening'
}
