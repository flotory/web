import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestPasswordReset } from './authApi'
import { apiRequest } from './api'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
}))

describe('requestPasswordReset', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset()
  })

  it('posts trimmed email to forgot-password endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      message: 'If that email is registered, we sent a password reset link.',
    })

    const message = await requestPasswordReset('  customer@example.com  ')

    expect(apiRequest).toHaveBeenCalledWith('/auth/forgot-password', {
      method: 'POST',
      body: { email: 'customer@example.com' },
    })
    expect(message).toBe('If that email is registered, we sent a password reset link.')
  })
})
