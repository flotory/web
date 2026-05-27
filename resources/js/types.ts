export type UserRole = 'admin' | 'customer'

export interface Venue {
  id: number
  name: string
  slug: string
  logo?: string | null
  address?: string | null
  phone?: string | null
  website?: string | null
  archived?: boolean
  deleted_at?: string | null
  customers_count?: number
  visits_count?: number
  rewards_count?: number
  joined_count?: number
}

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  active_venue_id?: number | null
  active_venue?: Venue | null
}

export interface Customer {
  id: number
  venue_id: number
  user_id: number
  qr_token: string
  stamps: number
  venue?: Venue
  user?: User
}

export interface Reward {
  id: number
  venue_id: number
  title: string
  required_stamps: number
  reward_type: string
  active: boolean
}

export interface Visit {
  id: number
  customer_id: number
  venue_id: number
  created_at: string
}

export interface StampAddedPayload {
  customer: Customer
  venue: Venue
  previous_stamps: number
  added_stamps: number
  stamps: number
  next_reward: Reward | null
  available_rewards: Reward[]
  message: string
  occurred_at: string
}
