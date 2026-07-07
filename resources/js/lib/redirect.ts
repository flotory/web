import { MOBILE_APP_PATH } from '@/lib/mobileApp'

const INTERNAL_PATH_PREFIXES = [
  '/login',
  '/register',
  '/v/',
  '/app',
  '/onboarding',
  '/dashboard',
  '/my-venues',
  '/customers',
  '/rewards',
  '/analytics',
  '/team',
  '/settings',
  '/account',
  '/admin/',
  '/invite/',
  '/',
]

const OWNER_WORKSPACE_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/my-venues',
  '/rewards',
  '/analytics',
  '/team',
  '/customers',
]

export function isOwnerWorkspacePath(path: string): boolean {
  const base = path.split('?')[0] ?? path

  return OWNER_WORKSPACE_PREFIXES.some((prefix) => base === prefix || base.startsWith(`${prefix}/`))
}

function matchesInternalPrefix(path: string, prefix: string): boolean {
  if (path === prefix || path.startsWith(`${prefix}?`)) {
    return true
  }

  const base = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix

  return path.startsWith(`${base}/`)
}

export function isSafeInternalRedirect(path: string): boolean {
  if (!path.startsWith('/')) {
    return false
  }

  if (path.startsWith('//')) {
    return false
  }

  return INTERNAL_PATH_PREFIXES.some((prefix) => matchesInternalPrefix(path, prefix))
}

export function sanitizeRedirect(path: string | null | undefined, fallback = MOBILE_APP_PATH): string {
  if (!path || !isSafeInternalRedirect(path)) {
    return fallback
  }

  return path
}
