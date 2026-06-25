import type { MobileUser } from '../types/auth'

const PLACEHOLDER_NAMES = new Set(['guest', 'apple account', 'apple user'])

function isPrivateFlotoryEmail(email: string): boolean {
  return email.endsWith('@privaterelay.flotory.local')
}

function humanizeEmailLocal(email: string): string | null {
  const local = email.split('@')[0]?.trim()
  if (!local) return null

  const words = local
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())

  return words.length > 0 ? words.join(' ') : null
}

export function isPlaceholderProfileName(name: string | null | undefined): boolean {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) return true
  return PLACEHOLDER_NAMES.has(trimmed.toLowerCase())
}

export function profileDisplayName(user: MobileUser | null | undefined): string {
  if (!user) return 'Guest'

  const name = user.name?.trim() ?? ''
  if (name && !isPlaceholderProfileName(name)) {
    return name
  }

  const email = user.email?.trim() ?? ''
  if (email && !isPrivateFlotoryEmail(email)) {
    return humanizeEmailLocal(email) ?? 'Apple Account'
  }

  return user.apple_id ? 'Apple Account' : 'Guest'
}

export function profileFirstName(user: MobileUser | null | undefined): string {
  const display = profileDisplayName(user)
  if (display === 'Guest' || display === 'Apple Account') {
    return display === 'Apple Account' ? 'there' : 'there'
  }
  return display.split(/\s+/)[0] ?? display
}

export function profileInitials(user: MobileUser | null | undefined): string {
  const display = profileDisplayName(user)
  return display
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function displayNameFromAppleEmail(email: string | null | undefined): string | undefined {
  const trimmed = email?.trim() ?? ''
  if (!trimmed || isPrivateFlotoryEmail(trimmed)) {
    return undefined
  }
  return humanizeEmailLocal(trimmed) ?? undefined
}
