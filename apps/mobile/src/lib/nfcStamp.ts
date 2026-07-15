import { apiRequest } from './api'
import { nfcLog } from './nfcReader'
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
  campaign_warning?: string | null
  message: string
  occurred_at: string
}

export async function fetchNfcTagPreview(token: string): Promise<NfcTagPreview> {
  nfcLog('fetchNfcTagPreview: start', { token: `${token.slice(0, 4)}…${token.slice(-4)}` })
  try {
    const preview = await apiRequest<NfcTagPreview>(`/public/nfc/t/${encodeURIComponent(token)}`)
    nfcLog('fetchNfcTagPreview: success', {
      venue: preview.venue?.name ?? null,
      tapUrl: preview.tap_url,
    })
    return preview
  } catch (error) {
    nfcLog('fetchNfcTagPreview: failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Coordinates read at the moment of the tap. The server checks them against the
 * venue (BUSINESS_RULES S10) — without them an enforced backend rejects the tap.
 */
export interface NfcStampLocation {
  latitude: number
  longitude: number
  accuracy?: number | null
}

export async function submitNfcStamp(
  token: string,
  authToken: string,
  location?: NfcStampLocation | null,
): Promise<NfcStampResponse> {
  nfcLog('submitNfcStamp: start', {
    token: `${token.slice(0, 4)}…${token.slice(-4)}`,
    hasLocation: Boolean(location),
  })
  try {
    const response = await apiRequest<NfcStampResponse>(`/nfc/t/${encodeURIComponent(token)}/stamp`, {
      method: 'POST',
      token: authToken,
      body: location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            ...(typeof location.accuracy === 'number' ? { accuracy: location.accuracy } : {}),
          }
        : undefined,
    })
    nfcLog('submitNfcStamp: success', {
      stamps: response.stamps,
      addedStamps: response.added_stamps,
      venue: response.venue?.name ?? response.customer.venue?.name ?? null,
      message: response.message,
    })
    return response
  } catch (error) {
    nfcLog('submitNfcStamp: failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
