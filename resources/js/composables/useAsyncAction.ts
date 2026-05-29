import { computed, onBeforeUnmount, ref } from 'vue'

export interface UseAsyncActionOptions {
  /** How long the success label stays visible before returning to idle. */
  successMs?: number
  /** How long the error label stays visible before returning to idle. */
  errorMs?: number
  /** Ensures loading text is readable even on very fast API responses. */
  minLoadingMs?: number
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function useAsyncAction(options: UseAsyncActionOptions = {}) {
  const loading = ref(false)
  const success = ref(false)
  const error = ref(false)

  const successMs = options.successMs ?? 2000
  const errorMs = options.errorMs ?? 2200
  const minLoadingMs = options.minLoadingMs ?? 350

  let successTimer: ReturnType<typeof setTimeout> | undefined
  let errorTimer: ReturnType<typeof setTimeout> | undefined

  function clearTimers() {
    if (successTimer) {
      clearTimeout(successTimer)
      successTimer = undefined
    }
    if (errorTimer) {
      clearTimeout(errorTimer)
      errorTimer = undefined
    }
  }

  function reset() {
    loading.value = false
    success.value = false
    error.value = false
  }

  async function run(task: () => Promise<void>) {
    clearTimers()
    loading.value = true
    success.value = false
    error.value = false

    try {
      const startedAt = Date.now()
      await task()
      const remaining = minLoadingMs - (Date.now() - startedAt)
      if (remaining > 0) {
        await wait(remaining)
      }

      loading.value = false
      success.value = true
      successTimer = setTimeout(() => {
        success.value = false
      }, successMs)
    } catch {
      loading.value = false
      error.value = true
      errorTimer = setTimeout(() => {
        error.value = false
      }, errorMs)
      throw new Error('async-action-failed')
    }
  }

  onBeforeUnmount(clearTimers)

  return {
    loading: computed(() => loading.value),
    success: computed(() => success.value),
    error: computed(() => error.value),
    run,
    reset,
  }
}
