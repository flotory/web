import { describe, expect, it } from 'vitest'

import {
  landingBenefitsMaxIndex,
  landingBenefitsSlidesPerView,
  landingOwnerBenefits,
} from '@/lib/landingBenefits'

describe('landingBenefits', () => {
  it('lists owner benefits with the strongest value props first', () => {
    expect(landingOwnerBenefits[0]?.id).toBe('guest-cards')
    expect(landingOwnerBenefits[1]?.id).toBe('nfc-counter')
    expect(landingOwnerBenefits[2]?.id).toBe('owner-dashboard')
    expect(landingOwnerBenefits.length).toBeGreaterThan(3)
  })

  it('resolves slides per view by breakpoint', () => {
    expect(landingBenefitsSlidesPerView(390)).toBe(1)
    expect(landingBenefitsSlidesPerView(820)).toBe(2)
    expect(landingBenefitsSlidesPerView(1280)).toBe(3)
  })

  it('computes the max carousel index from item count and slides per view', () => {
    expect(landingBenefitsMaxIndex(9, 3)).toBe(6)
    expect(landingBenefitsMaxIndex(9, 2)).toBe(7)
    expect(landingBenefitsMaxIndex(9, 1)).toBe(8)
  })
})
