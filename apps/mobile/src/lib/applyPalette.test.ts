import { describe, expect, it } from 'vitest'

import { mapPlatformPalette } from './applyPalette'

describe('mapPlatformPalette', () => {
  it('maps snake_case API keys to camelCase theme keys', () => {
    expect(
      mapPlatformPalette({
        primary: '#050D1E',
        primary_soft: '#0c1a30',
        accent_active: '#c4893f',
        ink_muted: '#5c6478',
      }),
    ).toEqual({
      primary: '#050D1E',
      primarySoft: '#0c1a30',
      accentActive: '#c4893f',
      inkMuted: '#5c6478',
    })
  })

  it('ignores unknown keys and empty values', () => {
    expect(mapPlatformPalette({ unknown_key: '#fff', accent: '' })).toEqual({})
  })
})
