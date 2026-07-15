import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useAsyncAction } from './useAsyncAction'

describe('useAsyncAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('transitions loading → success and clears success after timeout', async () => {
    const scope = effectScope()
    const action = scope.run(() => useAsyncAction({ minLoadingMs: 0, successMs: 1000 }))!

    const promise = action.run(async () => {})
    expect(action.loading.value).toBe(true)

    await promise

    expect(action.loading.value).toBe(false)
    expect(action.success.value).toBe(true)
    expect(action.error.value).toBe(false)

    vi.advanceTimersByTime(1000)
    expect(action.success.value).toBe(false)

    scope.stop()
  })

  it('shows error state and rethrows async-action-failed', async () => {
    const scope = effectScope()
    const action = scope.run(() => useAsyncAction({ minLoadingMs: 0, errorMs: 500 }))!

    await expect(action.run(async () => {
      throw new Error('boom')
    })).rejects.toThrow('async-action-failed')

    expect(action.loading.value).toBe(false)
    expect(action.error.value).toBe(true)

    vi.advanceTimersByTime(500)
    expect(action.error.value).toBe(false)

    scope.stop()
  })

  it('reset clears all flags', async () => {
    const scope = effectScope()
    const action = scope.run(() => useAsyncAction({ minLoadingMs: 0 }))!

    await action.run(async () => {})
    action.reset()

    expect(action.loading.value).toBe(false)
    expect(action.success.value).toBe(false)
    expect(action.error.value).toBe(false)

    scope.stop()
  })
})
