export type UserRole = 'owner' | 'customer'

export interface MobileUser {
  id: number
  name: string
  email: string
  is_admin: boolean
  active_venue_id?: number | null
  google_id?: string | null
  apple_id?: string | null
}

export interface AuthResponse {
  user: MobileUser
  token: string
}

export interface VenueMembership {
  id: number
  name: string
  slug: string
  membership_role?: 'owner' | 'staff' | null
}

