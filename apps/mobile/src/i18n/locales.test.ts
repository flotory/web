import { describe, expect, it } from 'vitest'

import en from './locales/en'
import hy from './locales/hy'

describe('mobile localization catalogs', () => {
  it('includes Armenian strings for priority customer flows', () => {
    expect(hy.tabs.wallet).toBe('Դրամապանակ')
    expect(hy.home.startFirstCard).toContain('լոյալության')
    expect(hy.redeem.slideToRedeem).toContain('Սահեցրեք')
    expect(hy.join.startCollecting).toContain('պարգևներ')
  })

  it('keeps matching top-level domains between English and Armenian', () => {
    expect(Object.keys(hy).sort()).toEqual(Object.keys(en).sort())
  })
})
