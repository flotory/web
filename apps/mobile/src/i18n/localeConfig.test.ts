import { describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE, deviceLocale, resolveLocale } from '../i18n'
import { localeOptions } from './localeConfig'

describe('locale config', () => {
  it('defaults to English for new installs', () => {
    expect(DEFAULT_LOCALE).toBe('en')
    expect(deviceLocale()).toBe('en')
  })

  it('resolves supported locale tags', () => {
    expect(resolveLocale('en-US')).toBe('en')
    expect(resolveLocale('hy-AM')).toBe('hy')
    expect(resolveLocale('fr')).toBeNull()
  })

  it('exposes English first in the language picker', () => {
    expect(localeOptions[0]).toEqual({ value: 'en', label: 'English' })
    expect(localeOptions[1]).toEqual({ value: 'hy', label: 'Հայերեն' })
  })
})
