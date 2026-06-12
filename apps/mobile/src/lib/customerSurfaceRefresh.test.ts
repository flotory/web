import { describe, expect, it, vi } from 'vitest'

import { notifyCustomerSurfaceRefresh, subscribeCustomerSurfaceRefresh } from './customerSurfaceRefresh'

describe('customerSurfaceRefresh', () => {
  it('notifies subscribers and allows unsubscribe', () => {
    const first = vi.fn()
    const second = vi.fn()

    const unsubscribeFirst = subscribeCustomerSurfaceRefresh(first)
    const unsubscribeSecond = subscribeCustomerSurfaceRefresh(second)

    notifyCustomerSurfaceRefresh()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    unsubscribeFirst()
    notifyCustomerSurfaceRefresh()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)

    unsubscribeSecond()
  })
})
