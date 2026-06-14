import { describe, expect, it } from 'vitest'

import { evaluateAppUpdateGate } from './appUpdatePolicy'
import { compareAppVersions, isAppVersionBelow } from './semver'

const fallbackUrl = 'https://flotory.com/app'

describe('semver', () => {
  it('compares dotted versions', () => {
    expect(compareAppVersions('1.0.13', '1.0.9')).toBe(1)
    expect(compareAppVersions('1.0.9', '1.0.13')).toBe(-1)
    expect(compareAppVersions('1.0.13', '1.0.13')).toBe(0)
  })

  it('detects versions below minimum', () => {
    expect(isAppVersionBelow('1.0.12', '1.0.13')).toBe(true)
    expect(isAppVersionBelow('1.0.13', '1.0.13')).toBe(false)
    expect(isAppVersionBelow('1.0.14', '1.0.13')).toBe(false)
    expect(isAppVersionBelow('1.0.13', null)).toBe(false)
  })
})

describe('evaluateAppUpdateGate', () => {
  it('blocks only when force_update is enabled and app is outdated', () => {
    expect(
      evaluateAppUpdateGate(
        {
          min_ios_version: '1.0.13',
          force_update: false,
        },
        { currentVersion: '1.0.12', platform: 'ios', fallbackUpdateUrl: fallbackUrl },
      ).blocked,
    ).toBe(false)

    expect(
      evaluateAppUpdateGate(
        {
          min_ios_version: '1.0.13',
          force_update: true,
        },
        { currentVersion: '1.0.12', platform: 'ios', fallbackUpdateUrl: fallbackUrl },
      ).blocked,
    ).toBe(true)

    expect(
      evaluateAppUpdateGate(
        {
          min_ios_version: '1.0.13',
          force_update: true,
        },
        { currentVersion: '1.0.13', platform: 'ios', fallbackUpdateUrl: fallbackUrl },
      ).blocked,
    ).toBe(false)
  })

  it('allows launch when config is unavailable', () => {
    expect(
      evaluateAppUpdateGate(null, {
        currentVersion: '1.0.12',
        platform: 'ios',
        fallbackUpdateUrl: fallbackUrl,
      }).blocked,
    ).toBe(false)
  })
})
