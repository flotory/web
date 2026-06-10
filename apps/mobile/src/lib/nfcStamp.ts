import { apiRequest } from './api'
import type { MilestoneProgress, RewardRef, VenueRef, WalletCard } from '../types/loyalty'

export interface NfcTagPreview {
  token: string
  label?: string | null
  tap_url: string
  venue?: VenueRef | null
}

export interface NfcStampResponse {
  scan_type: 'nfc'
  customer: WalletCard
  venue?: VenueRef | null
  previous_stamps: number
  added_stamps: number
  stamps: number
  next_reward: RewardRef | null
  available_rewards: RewardRef[]
  milestones: MilestoneProgress[]
  current_cycle: number
  cycle_completed: boolean
  joined_on_scan?: boolean
  message: string
  occurred_at: string
}

export async function fetchNfcTagPreview(token: string): Promise<NfcTagPreview> {
  return apiRequest<NfcTagPreview>(`/public/nfc/t/${encodeURIComponent(token)}`)
}

export async function submitNfcStamp(token: string, authToken: string): Promise<NfcStampResponse> {
  return apiRequest<NfcStampResponse>(`/nfc/t/${encodeURIComponent(token)}/stamp`, {
    method: 'POST',
    token: authToken,
  })
}
