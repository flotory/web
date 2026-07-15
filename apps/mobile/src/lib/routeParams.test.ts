import { describe, expect, it } from 'vitest'

import { readRouteParam } from './routeParams'

describe('readRouteParam', () => {
  it('returns string params', () => {
    expect(readRouteParam('token')).toBe('token')
  })

  it('returns first array element', () => {
    expect(readRouteParam(['first', 'second'])).toBe('first')
  })

  it('returns null for empty values', () => {
    expect(readRouteParam(undefined)).toBeNull()
    expect(readRouteParam('')).toBeNull()
    expect(readRouteParam([])).toBeNull()
  })
})
