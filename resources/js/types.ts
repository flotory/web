export type VenueCategory = 'cafe' | 'restaurant' | 'bar' | 'bakery'

export interface Venue {
  id: number
  name: string
  slug: string
  category?: VenueCategory | null
  membership_role?: 'owner' | 'staff' | null
  logo?: string | null
  logo_thumb?: string | null
  cover_image?: string | null
  cover_image_thumb?: string | null
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
  is_admin: boolean
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
  summary?: CustomerCardSummary
}

export interface CustomerCardSummary {
  stamps: number
  max_stamps: number
  pending_rewards_count: number
  next_reward_title: string | null
  next_reward_stamps: number | null
  stamps_to_next: number | null
}

export interface Reward {
  id: number
  venue_id: number
  title: string
  description?: string | null
  image?: string | null
  image_thumb?: string | null
  required_stamps: number
  sort_order?: number
  active: boolean
}

export interface MilestoneProgress {
  id: number
  title: string
  description?: string | null
  image?: string | null
  image_thumb?: string | null
  required_stamps: number
  active: boolean
  unlocked: boolean
  claimed: boolean
  claimed_at?: string | null
}

export interface RewardJourney {
  current_cycle: number
  current_stamps: number
  next_milestone: Reward | null
  milestones: MilestoneProgress[]
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
  milestones: MilestoneProgress[]
  current_cycle: number
  cycle_completed: boolean
  message: string
  occurred_at: string
}
