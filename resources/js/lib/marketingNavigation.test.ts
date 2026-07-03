import { describe, expect, it } from 'vitest'

import { MARKETING_HOME_PATH } from '@/lib/brand'
import { hasMarketingHistoryBack, resolveMarketingBack } from '@/lib/marketingNavigation'

describe('marketingNavigation', () => {
  it('detects when browser history has a previous route', () => {
    expect(hasMarketingHistoryBack({ back: '/contact' })).toBe(true)
    expect(resolveMarketingBack({ back: '/contact' })).toBe('back')
  })

  it('falls back to marketing home when there is no previous route', () => {
    expect(hasMarketingHistoryBack({})).toBe(false)
    expect(resolveMarketingBack({})).toBe(MARKETING_HOME_PATH)
    expect(resolveMarketingBack({}, '/login')).toBe('/login')
  })
})
