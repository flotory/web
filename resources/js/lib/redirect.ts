const INTERNAL_PATH_PREFIXES = ['/login', '/register', '/v/', '/card', '/cafes', '/onboarding', '/dashboard', '/my-venues', '/scanner', '/customers', '/rewards', '/analytics', '/team', '/settings', '/account', '/']

export function isSafeInternalRedirect(path: string): boolean {
  if (!path.startsWith('/')) {
    return false
  }

  if (path.startsWith('//')) {
    return false
  }

  return INTERNAL_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))
}

export function sanitizeRedirect(path: string | null | undefined, fallback = '/card'): string {
  if (!path || !isSafeInternalRedirect(path)) {
    return fallback
  }

  return path
}
