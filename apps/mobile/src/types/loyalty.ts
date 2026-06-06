export interface CardSummary {
  stamps: number
  max_stamps: number
  pending_rewards_count: number
  next_reward_title: string | null
  next_reward_stamps: number | null
  stamps_to_next: number | null
}

export interface VenueRef {
  id: number
  name: string
  slug?: string
  logo?: string | null
  logo_thumb?: string | null
  cover_image?: string | null
  cover_image_thumb?: string | null
  category?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface RewardRef {
  id: number
  title: string
  description?: string | null
  image?: string | null
  image_thumb?: string | null
  required_stamps: number
}

export interface VenuePromotion {
  name: string
  template_id: string
  multiplier: number
  headline: string
  message: string
  ends_at?: string | null
  days_left?: number | null
}

/** Active venue campaigns for the customer home carousel. */
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

export interface WalletCard {
  id: number
  venue_id: number
  stamps: number
  qr_token?: string | null
  created_at?: string
  venue?: VenueRef | null
  summary?: CardSummary
  recent_visits?: VisitRow[]
  promotion?: VenuePromotion | null
}

export interface ApiClaimedReward {
  id: string
  card_id: number
  title: string
  claimed_at: string
}

export interface MilestoneProgress {
  id: number
  title: string
  required_stamps: number
  image?: string | null
  image_thumb?: string | null
  unlocked?: boolean
  claimed?: boolean
  claimed_at?: string | null
}

export interface RewardJourney {
  current_cycle: number
  current_stamps: number
  milestones: MilestoneProgress[]
}

export interface RewardWalletItem {
  unlock_id: number
  reward: RewardRef
  customer: WalletCard
}

export interface VisitRow {
  id: number
  created_at?: string
}

export interface ActivityRow {
  id: string
  label: string
  time: string
}
