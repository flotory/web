import type { MilestoneProgress, RewardRef, VenueRef, WalletCard } from './loyalty'

export interface StampAddedPayload {
  customer: WalletCard
  venue: VenueRef
  previous_stamps: number
  added_stamps: number
  stamps: number
  next_reward: RewardRef | null
  available_rewards: RewardRef[]
  milestones: MilestoneProgress[]
  current_cycle: number
  cycle_completed: boolean
  message: string
  occurred_at: string
}

export interface RewardRedeemedPayload {
  customer: WalletCard
  venue: VenueRef
  unlock_id: number
  reward: RewardRef
  message: string
  occurred_at: string
}
