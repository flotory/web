import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest, messageFromApiPayload } from './api'

vi.mock('./config', () => ({
  API_BASE_URL: 'https://flotory.com/api',
}))

vi.mock('../i18n/runtime', () => ({
  currentLocale: () => 'en',
}))

describe('messageFromApiPayload', () => {
  it('prefers first validation error over message', () => {
    expect(
      messageFromApiPayload(
        { message: 'Validation failed', errors: { email: ['Email is required.'] } },
        'fallback',
      ),
    ).toBe('Email is required.')
  })

  it('falls back to message then default', () => {
    expect(messageFromApiPayload({ message: 'Not found.' }, 'fallback')).toBe('Not found.')
    expect(messageFromApiPayload({}, 'fallback')).toBe('fallback')
  })
})

describe('ApiError', () => {
  it('stores status and field errors', () => {
    const error = new ApiError('Invalid', 422, { email: ['Taken'] })

    expect(error.message).toBe('Invalid')
    expect(error.status).toBe(422)
    expect(error.fieldErrors).toEqual({ email: ['Taken'] })
  })
})

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('throws ApiError with reward-specific 404 copy', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response)

    await expect(apiRequest('/customer/rewards/1')).rejects.toMatchObject({
      message: 'This reward is no longer available. Pull to refresh Home and try again.',
      status: 404,
    })
  })

  it('uses validation message from error payload', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ errors: { password: ['Password is incorrect.'] } }),
    } as Response)

    await expect(
      apiRequest('/auth/account', { method: 'DELETE', body: { confirmation: 'DELETE' } }),
    ).rejects.toMatchObject({
      message: 'Password is incorrect.',
      status: 422,
    })
  })

  it('returns undefined for empty 204 responses', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => '0' },
      text: async () => '',
    } as unknown as Response)

    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })
})
