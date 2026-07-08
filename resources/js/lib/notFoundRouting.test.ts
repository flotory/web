import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api'
import {
  isApiNotFoundError,
  parsePositiveIntParam,
  redirectToNotFound,
  redirectToNotFoundIfMissing,
} from '@/lib/notFoundRouting'

describe('notFoundRouting', () => {
  it('detects API 404 errors', () => {
    expect(isApiNotFoundError(new ApiError('Not found', 404))).toBe(true)
    expect(isApiNotFoundError(new ApiError('Forbidden', 403))).toBe(false)
    expect(isApiNotFoundError(new Error('nope'))).toBe(false)
  })

  it('parses positive integer route params', () => {
    expect(parsePositiveIntParam('12')).toBe(12)
    expect(parsePositiveIntParam('0')).toBeNull()
    expect(parsePositiveIntParam('abc')).toBeNull()
    expect(parsePositiveIntParam('-1')).toBeNull()
    expect(parsePositiveIntParam(['7'])).toBe(7)
  })

  it('redirects to the not-found route', () => {
    const replace = vi.fn()
    redirectToNotFound({ replace } as never)
    expect(replace).toHaveBeenCalledWith({ name: 'not-found' })
  })

  it('redirects only for API 404 errors', () => {
    const replace = vi.fn()
    const router = { replace } as never

    expect(redirectToNotFoundIfMissing(new ApiError('Not found', 404), router)).toBe(true)
    expect(replace).toHaveBeenCalledWith({ name: 'not-found' })

    replace.mockClear()
    expect(redirectToNotFoundIfMissing(new ApiError('Forbidden', 403), router)).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })
})
