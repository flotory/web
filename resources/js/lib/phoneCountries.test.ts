import { describe, expect, it } from 'vitest'

import {
  countryDialCode,
  countryFlag,
  detectDefaultPhoneCountry,
  listPhoneCountries,
} from './phoneCountries'

describe('countryFlag', () => {
  it('builds regional indicator emoji from country code', () => {
    expect(countryFlag('AM')).toBe('🇦🇲')
    expect(countryFlag('US')).toBe('🇺🇸')
  })
})

describe('countryDialCode', () => {
  it('returns international prefix', () => {
    expect(countryDialCode('AM')).toBe('+374')
    expect(countryDialCode('US')).toBe('+1')
  })
})

describe('listPhoneCountries', () => {
  it('returns sorted country options with dial codes', () => {
    const countries = listPhoneCountries()

    expect(countries.length).toBeGreaterThan(100)
    expect(countries[0].name.localeCompare(countries[1].name)).toBeLessThanOrEqual(0)

    const armenia = countries.find((country) => country.code === 'AM')
    expect(armenia).toMatchObject({ dialCode: '+374', flag: '🇦🇲' })
  })
})

describe('detectDefaultPhoneCountry', () => {
  it('defaults to Armenia for launch market', () => {
    expect(detectDefaultPhoneCountry()).toBe('AM')
  })
})
