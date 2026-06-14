import { beforeEach, describe, expect, it, vi } from 'vitest'

import { completeNfcStampSuccess } from './completeNfcStampSuccess'
import { refreshCustomerSurfacesAfterStamp } from './customerData'
import { notifyCustomerSurfaceRefresh } from './customerSurfaceRefresh'
import type { NfcStampResponse } from './nfcStamp'
import type { VenueRef, WalletCard } from '../types/loyalty'
import type { StampAddedPayload } from '../types/realtime'

vi.mock('./customerData', () => ({
  refreshCustomerSurfacesAfterStamp: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./customerSurfaceRefresh', () => ({
  notifyCustomerSurfaceRefresh: vi.fn(),
}))

const venue: VenueRef = { id: 10, name: 'Demo Cafe', slug: 'demo-cafe' }

function card(stamps: number): WalletCard {
  return { id: 42, venue_id: venue.id, stamps, venue }
}

function nfcResponse(overrides: Partial<NfcStampResponse> = {}): NfcStampResponse {
  return {
    scan_type: 'nfc',
    customer: card(4),
    venue,
    previous_stamps: 3,
    added_stamps: 1,
    stamps: 4,
    next_reward: { id: 1, title: 'Free coffee', required_stamps: 5 },
    available_rewards: [],
    milestones: [],
    current_cycle: 1,
    cycle_completed: false,
    message: '+1 stamp added',
    occurred_at: '2026-06-04T19:00:00.000Z',
    ...overrides,
  }
}

describe('completeNfcStampSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(refreshCustomerSurfacesAfterStamp).mockResolvedValue(undefined)
  })

  it('prefetches customer surfaces, ingests the stamp, notifies listeners, then navigates', async () => {
    const ingestStamp = vi.fn()
    const router = { navigate: vi.fn(), replace: vi.fn() }
    const response = nfcResponse()

    await completeNfcStampSuccess(response, 'auth-token', ingestStamp, router)

    expect(refreshCustomerSurfacesAfterStamp).toHaveBeenCalledWith('auth-token', 10)
    expect(ingestStamp).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: response.customer,
        venue,
        stamps: 4,
      }),
    )
    expect(notifyCustomerSurfaceRefresh).toHaveBeenCalledTimes(1)
    expect(router.navigate).toHaveBeenCalledWith({
      pathname: '/card/[cardId]',
      params: { cardId: '42', venueId: '10' },
    })
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('uses replace navigation when requested', async () => {
    const router = { navigate: vi.fn(), replace: vi.fn() }

    await completeNfcStampSuccess(nfcResponse(), 'auth-token', vi.fn(), router, 'replace')

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/card/[cardId]',
      params: { cardId: '42', venueId: '10' },
    })
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('passes nfc education when the guest joined on first tap', async () => {
    const router = { navigate: vi.fn(), replace: vi.fn() }

    await completeNfcStampSuccess(nfcResponse({ joined_on_scan: true }), 'auth-token', vi.fn(), router)

    expect(router.navigate).toHaveBeenCalledWith({
      pathname: '/card/[cardId]',
      params: { cardId: '42', venueId: '10', nfcEducation: '1' },
    })
  })

  it('still ingests and navigates when prefetch fails', async () => {
    vi.mocked(refreshCustomerSurfacesAfterStamp).mockRejectedValue(new Error('offline'))
    const ingestStamp = vi.fn()
    const router = { navigate: vi.fn(), replace: vi.fn() }

    await completeNfcStampSuccess(nfcResponse(), 'auth-token', ingestStamp, router)

    expect(ingestStamp).toHaveBeenCalledWith(expect.objectContaining({ stamps: 4 }) as StampAddedPayload)
    expect(notifyCustomerSurfaceRefresh).toHaveBeenCalledTimes(1)
    expect(router.navigate).toHaveBeenCalled()
  })
})
