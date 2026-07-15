import { describe, expect, it } from 'vitest'

import { sortHomeCampaigns } from './homeCampaigns'
import type { HomeCampaign } from '../types/loyalty'

function campaign(overrides: Partial<HomeCampaign> & Pick<HomeCampaign, 'campaign_id'>): HomeCampaign {
  return {
    card_id: 1,
    venue_id: 1,
    venue_name: 'Demo Cafe',
    name: 'Campaign',
    template_id: 'quiet_day',
    multiplier: 1,
    applies_now: false,
    headline: 'Headline',
    message: 'Message',
    ...overrides,
  }
}

describe('sortHomeCampaigns', () => {
  it('puts applies_now campaigns first', () => {
    const sorted = sortHomeCampaigns([
      campaign({ campaign_id: 1, applies_now: false }),
      campaign({ campaign_id: 2, applies_now: true }),
    ])

    expect(sorted.map((item) => item.campaign_id)).toEqual([2, 1])
  })

  it('sorts by multiplier then days_left', () => {
    const sorted = sortHomeCampaigns([
      campaign({ campaign_id: 1, applies_now: true, multiplier: 1, days_left: 3 }),
      campaign({ campaign_id: 2, applies_now: true, multiplier: 2, days_left: 10 }),
      campaign({ campaign_id: 3, applies_now: true, multiplier: 2, days_left: 1 }),
    ])

    expect(sorted.map((item) => item.campaign_id)).toEqual([3, 2, 1])
  })
})
