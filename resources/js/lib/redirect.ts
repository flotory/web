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
  '/settings',
  '/customers',
]

export function isOwnerWorkspacePath(path: string): boolean {
  const base = path.split('?')[0] ?? path

  return OWNER_WORKSPACE_PREFIXES.some((prefix) => base === prefix || base.startsWith(`${prefix}/`))
}

export function isSafeInternalRedirect(path: string): boolean {
  if (!path.startsWith('/')) {
    return false
  }

  if (path.startsWith('//')) {
    return false
  }

  return INTERNAL_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))
}

export function sanitizeRedirect(path: string | null | undefined, fallback = MOBILE_APP_PATH): string {
  if (!path || !isSafeInternalRedirect(path)) {
    return fallback
  }

  return path
}
