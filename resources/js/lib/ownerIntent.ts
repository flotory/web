const OWNER_INTENT_KEY = 'loyalty_owner_onboarding_intent'

export function hasOwnerOnboardingIntent(): boolean {
  return sessionStorage.getItem(OWNER_INTENT_KEY) === '1'
}

export function markOwnerOnboardingIntent(): void {
  sessionStorage.setItem(OWNER_INTENT_KEY, '1')
}

export function clearOwnerOnboardingIntent(): void {
  sessionStorage.removeItem(OWNER_INTENT_KEY)
}
