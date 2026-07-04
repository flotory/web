import { describe, expect, it } from 'vitest'

import {
  accountFreeTrialLabel,
  formatVenueAdditionalMonthlyPrice,
  formatVenueFirstMonthlyPrice,
  pricingIncludedFeatures,
  ACCOUNT_FREE_TRIAL_MONTHS,
  VENUE_ADDITIONAL_MONTHLY_PRICE_AMD,
  VENUE_FIRST_MONTHLY_PRICE_AMD,
} from '@/lib/pricing'

describe('pricing', () => {
  it('uses fixed monthly venue prices in AMD', () => {
    expect(VENUE_FIRST_MONTHLY_PRICE_AMD).toBe(9900)
    expect(VENUE_ADDITIONAL_MONTHLY_PRICE_AMD).toBe(4900)
  })

  it('formats venue prices for display', () => {
    expect(formatVenueFirstMonthlyPrice('en')).toMatch(/9[\s,]?900/)
    expect(formatVenueAdditionalMonthlyPrice('en')).toMatch(/4[\s,]?900/)
  })

  it('lists included product features', () => {
    expect(pricingIncludedFeatures.length).toBeGreaterThan(3)
    expect(pricingIncludedFeatures.some((feature) => feature.includes('NFC'))).toBe(true)
  })

  it('offers one free trial month per owner account', () => {
    expect(ACCOUNT_FREE_TRIAL_MONTHS).toBe(1)
    expect(accountFreeTrialLabel()).toBe('1 month free')
  })
})
