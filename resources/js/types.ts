import type { VenueCategory } from '@/lib/venueCategories'

export type { VenueCategory }

export type VenueListingStatus = 'draft' | 'pending_review' | 'published' | 'rejected'

export interface Venue {
  id: number
  name: string
  slug: string
  category?: VenueCategory | null
  membership_role?: 'owner' | null
  logo?: string | null
  logo_thumb?: string | null
  cover_image?: string | null
  cover_image_thumb?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  google_place_id?: string | null
  address_quota?: {
    limit: number
    used_today: number
    remaining: number
  } | null
  phone?: string | null
  website?: string | null
  average_check_amount?: number | null
  status?: VenueListingStatus | null
  review_note?: string | null
  submitted_at?: string | null
  published_at?: string | null
  timezone?: string | null
  archived?: boolean
  deleted_at?: string | null
  customers_count?: number
  visits_count?: number
  rewards_count?: number
  joined_count?: number
  branches_count?: number
}

export interface VenueBranch {
  id: number
  parent_venue_id?: number | null
  name: string
  slug: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  google_place_id?: string | null
}

export interface User {
  id: number
  name: string
  email: string
  is_admin: boolean
  locale?: 'en' | 'hy' | null
  currency?: 'USD' | 'AMD' | null
  birthday?: string | null
  active_venue_id?: number | null
  active_venue?: Venue | null
}

export type CustomerActivityStatus = 'active' | 'inactive' | 'new' | 'cooling'

export interface Customer {
  id: number
  venue_id: number
  user_id: number
  /** Deprecated — staff fallback uses customer_id; universal My QR uses user stamp token. */
  qr_token?: string | null
  stamps: number
  venue?: Venue
  user?: User & { birthday?: string | null }
  summary?: CustomerCardSummary
  joined_at?: string | null
  created_at?: string | null
  last_visit_at?: string | null
  visits_count?: number
  rewards_unlocked_count?: number
  rewards_claimed_count?: number
  activity_status?: CustomerActivityStatus
  recent_visits?: Array<{ id: number; created_at: string }>
}

export interface CustomerActivitySummary {
  total: number
  active: number
  inactive: number
  new: number
  cooling: number
}

export interface CustomerVisitRecord {
  id: number
  created_at: string
  staff_name?: string | null
}

export interface CustomerRewardHistoryRecord {
  id: number
  reward_id: number
  title?: string | null
  required_stamps?: number | null
  cycle_number: number
  unlocked_at?: string | null
  claimed_at?: string | null
  claimed_by_name?: string | null
}

export interface CustomerNoteRecord {
  id: number
  body: string
  author_name?: string | null
  created_at: string
}

export interface CustomerTimelineEvent {
  type: 'joined' | 'visit' | 'milestone_unlocked' | 'redemption' | 'cycle_completed'
  occurred_at: string
  title: string
  detail?: string | null
}

export interface CustomerProfileResponse {
  customer: Customer
  stats: {
    joined_at?: string | null
    last_visit_at?: string | null
    visits_count: number
    rewards_claimed_count: number
    rewards_unlocked_count: number
    stamps: number
    activity_status: CustomerActivityStatus
  }
  visits: CustomerVisitRecord[]
  reward_history: CustomerRewardHistoryRecord[]
  notes: CustomerNoteRecord[]
  timeline: CustomerTimelineEvent[]
}

export interface CustomerCardSummary {
  stamps: number
  max_stamps: number
  pending_rewards_count: number
  next_reward_title: string | null
  next_reward_stamps: number | null
  stamps_to_next: number | null
}

export interface VenuePromotion {
  headline: string
  message: string
}

export interface HomeCampaign {
  campaign_id: number
  card_id: number
  venue_id: number
  venue_name: string
  name: string
  template_id: string
  multiplier: number
  headline: string
  message: string
  applies_now: boolean
  ends_at?: string | null
  days_left?: number | null
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

export interface RewardRedeemedPayload {
  customer: Customer
  venue: Venue
  unlock_id: number
  reward: Reward
  claim_session_token: string | null
  message: string
  occurred_at: string
}
