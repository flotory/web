import { describe, expect, it } from 'vitest'

import { ApiError, apiErrorMessage, isAbortedRequest, isUnauthenticatedError, isVenueAccessDenied } from './api'

describe('isAbortedRequest', () => {
  it('detects abort errors', () => {
    expect(isAbortedRequest(new ApiError('Request aborted', 499))).toBe(true)
    expect(isAbortedRequest(new DOMException('Aborted', 'AbortError'))).toBe(true)
    expect(isAbortedRequest(new ApiError('Unauthenticated.', 401))).toBe(false)
  })
})

describe('isUnauthenticatedError', () => {
  it('detects 401 api errors', () => {
    expect(isUnauthenticatedError(new ApiError('Unauthenticated.', 401))).toBe(true)
    expect(isUnauthenticatedError(new ApiError('Forbidden', 403))).toBe(false)
    expect(isUnauthenticatedError(new Error('network'))).toBe(false)
  })
})

describe('isVenueAccessDenied', () => {
  it('detects workspace 404 responses', () => {
    expect(isVenueAccessDenied(new ApiError('This venue is not in your workspace.', 404))).toBe(true)
  })

  it('detects eloquent venue not found messages', () => {
    expect(
      isVenueAccessDenied(new ApiError('No query results for model [App\\Models\\Venue] [99]', 500)),
    ).toBe(true)
  })

  it('ignores unrelated api errors', () => {
    expect(isVenueAccessDenied(new ApiError('Unauthorized', 401))).toBe(false)
    expect(isVenueAccessDenied(new Error('network'))).toBe(false)
  })
})

describe('apiErrorMessage', () => {
  it('maps venue not found to workspace copy', () => {
    const error = new ApiError('No query results for model [App\\Models\\Venue] [12]', 404)

    expect(apiErrorMessage(error, 'fallback')).toBe('This venue is not in your workspace.')
  })

  it('maps generic forbidden to permission copy', () => {
    expect(apiErrorMessage(new ApiError('Forbidden', 403), 'fallback'))
      .toBe('You do not have permission to manage this venue.')
  })

  it('returns fallback for non-api errors', () => {
    expect(apiErrorMessage(new Error('boom'), 'Something went wrong')).toBe('Something went wrong')
  })

  it('preserves explicit api messages', () => {
    expect(apiErrorMessage(new ApiError('Slug is taken.', 422), 'fallback')).toBe('Slug is taken.')
  })
})

describe('ApiError', () => {
  it('stores status, field errors, and request id', () => {
    const error = new ApiError('Invalid', 422, { slug: ['Taken'] }, 'req-123')

    expect(error.status).toBe(422)
    expect(error.errors.slug).toEqual(['Taken'])
    expect(error.requestId).toBe('req-123')
  })
})
