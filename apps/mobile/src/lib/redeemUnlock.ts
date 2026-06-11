import { apiRequest } from './api'
import type { RewardRef } from '../types/loyalty'

export interface RedeemUnlockResponse {
  unlock: {
    id: number
    reward_id: number
    claimed_at: string
  }
  customer: {
    id: number
    stamps: number
    venue_id: number
  }
  next_reward: RewardRef | null
}

export async function redeemUnlock(unlockId: number, token: string): Promise<RedeemUnlockResponse> {
  return apiRequest<RedeemUnlockResponse>(`/customer/rewards/unlocks/${unlockId}/redeem`, {
    method: 'POST',
    token,
  })
}
