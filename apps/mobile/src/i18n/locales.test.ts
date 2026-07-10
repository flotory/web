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

  it('exposes forgot-password copy on login, not in settings', () => {
    expect(en.login.forgotPassword).toBe('Forgot password?')
    expect(en.forgotPassword.title).toBe('Forgot password?')
    expect('forgotPassword' in en.settings).toBe(false)
    expect(hy.login.forgotPassword).toContain('գաղտնաբառ')
    expect('forgotPassword' in hy.settings).toBe(false)
  })
})
