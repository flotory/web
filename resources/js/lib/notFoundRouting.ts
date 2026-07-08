import type { Router } from 'vue-router'

import { ApiError } from '@/lib/api'

export function isApiNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

export function redirectToNotFound(router: Router): void {
  void router.replace({ name: 'not-found' })
}

export function redirectToNotFoundIfMissing(error: unknown, router: Router): boolean {
  if (!isApiNotFoundError(error)) {
    return false
  }

  redirectToNotFound(router)
  return true
}

export function parsePositiveIntParam(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value

  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    return null
  }

  const parsed = Number(raw)

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}
