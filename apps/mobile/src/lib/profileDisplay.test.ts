import { describe, expect, it } from 'vitest'

import {
  displayNameFromAppleEmail,
  isPlaceholderProfileName,
  profileDisplayName,
  profileFirstName,
  profileInitials,
} from './profileDisplay'
import type { MobileUser } from '../types/auth'

const appleUser = (overrides: Partial<MobileUser> = {}): MobileUser => ({
  id: 1,
  name: 'Guest',
  email: 'jane.doe@icloud.com',
  apple_id: 'apple-123',
  ...overrides,
})

describe('profileDisplay', () => {
  it('shows a humanized email name for placeholder Apple users', () => {
    expect(profileDisplayName(appleUser())).toBe('Jane Doe')
    expect(profileInitials(appleUser())).toBe('JD')
    expect(profileFirstName(appleUser())).toBe('Jane')
  })

  it('keeps a real display name', () => {
    expect(profileDisplayName(appleUser({ name: 'Narek Divdaryan' }))).toBe('Narek Divdaryan')
  })

  it('falls back to Apple Account without a usable email', () => {
    expect(
      profileDisplayName(
        appleUser({
          email: 'apple_abc@privaterelay.flotory.local',
        }),
      ),
    ).toBe('Apple Account')
  })

  it('detects placeholder names', () => {
    expect(isPlaceholderProfileName('Guest')).toBe(true)
    expect(isPlaceholderProfileName('Narek')).toBe(false)
  })

  it('derives Apple sign-in names from email', () => {
    expect(displayNameFromAppleEmail('john_smith@me.com')).toBe('John Smith')
  })
})
