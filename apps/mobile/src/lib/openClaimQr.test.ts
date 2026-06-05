import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  findPendingUnlockId: vi.fn(),
  invalidateCustomerRewardCaches: vi.fn(),
}))

vi.mock('react-native', () => ({
  Alert: { alert: mocks.alert },
}))

vi.mock('./customerData', () => ({
  findPendingUnlockId: mocks.findPendingUnlockId,
  invalidateCustomerRewardCaches: mocks.invalidateCustomerRewardCaches,
}))

import { openClaimQrForUnlock } from './openClaimQr'

function router() {
  return {
    push: vi.fn(),
  }
}

describe('openClaimQrForUnlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens the claim route when the unlock is still pending', async () => {
    const appRouter = router()
    mocks.findPendingUnlockId.mockResolvedValue(123)

    await expect(openClaimQrForUnlock(appRouter as never, 'token', 123)).resolves.toBe(true)

    expect(mocks.invalidateCustomerRewardCaches).toHaveBeenCalledWith('token')
    expect(appRouter.push).toHaveBeenCalledWith({
      pathname: '/claim/[unlockId]',
      params: { unlockId: '123' },
    })
    expect(mocks.alert).not.toHaveBeenCalled()
  })

  it('alerts and refreshes when the unlock is stale', async () => {
    const appRouter = router()
    const onStale = vi.fn()
    mocks.findPendingUnlockId.mockResolvedValue(null)

    await expect(openClaimQrForUnlock(appRouter as never, 'token', 123, { onStale })).resolves.toBe(false)

    expect(onStale).toHaveBeenCalledOnce()
    expect(appRouter.push).not.toHaveBeenCalled()
    expect(mocks.alert).toHaveBeenCalledWith(
      'Reward already used',
      'This reward was redeemed at the café. Pull to refresh Home to see what is still available.',
    )
  })

  it('alerts on lookup failure', async () => {
    const appRouter = router()
    mocks.findPendingUnlockId.mockRejectedValue(new Error('offline'))

    await expect(openClaimQrForUnlock(appRouter as never, 'token', 123)).resolves.toBe(false)

    expect(appRouter.push).not.toHaveBeenCalled()
    expect(mocks.alert).toHaveBeenCalledWith('Could not open claim QR', 'Check your connection and try again.')
  })
})
