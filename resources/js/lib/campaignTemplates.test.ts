import { describe, expect, it } from 'vitest'

import type { Campaign } from './campaignTemplates'
import {
  campaignActiveDays,
  campaignCriteriaChips,
  campaignMultiplier,
  campaignShowsDayRow,
  campaignStatusLabel,
  campaignStatusTone,
  campaignTargetLabel,
  campaignTimeRange,
  defaultConfigFor,
  defaultNameFor,
  multiplierLabel,
  toggleDay,
} from './campaignTemplates'

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    venue_id: 1,
    template_id: 'quiet_day_promotion',
    name: 'Quiet Day',
    status: 'active',
    starts_at: null,
    ends_at: null,
    config: { stamp_multiplier: 2, days_of_week: [1, 2, 3] },
    push_enabled: true,
    audience_count: 10,
    activated_at: '2026-06-02T10:00:00Z',
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-02T10:00:00Z',
    ...overrides,
  }
}

describe('defaultConfigFor', () => {
  it('returns template defaults including lifetime stamps for vip', () => {
    expect(defaultConfigFor('vip_rewards')).toEqual({
      stamp_multiplier: 2,
      min_lifetime_stamps: 5,
      min_rewards_claimed: 1,
    })
  })
})

describe('defaultNameFor', () => {
  it('falls back to Campaign when template is missing from catalog', () => {
    expect(defaultNameFor('happy_hour', [])).toBe('Campaign')
  })
})

describe('campaignStatusLabel', () => {
  it('maps lifecycle states to owner-facing labels', () => {
    expect(campaignStatusLabel('active')).toBe('Running')
    expect(campaignStatusLabel('ended')).toBe('Ended')
  })
})

describe('campaignStatusTone', () => {
  it('maps active campaigns to green tone', () => {
    expect(campaignStatusTone('active')).toBe('green')
    expect(campaignStatusTone('draft')).toBe('blue')
  })
})

describe('multiplierLabel', () => {
  it('formats stamp multiplier copy', () => {
    expect(multiplierLabel(3)).toBe('3× stamps')
  })
})

describe('toggleDay', () => {
  it('adds and removes iso weekdays in sorted order', () => {
    expect(toggleDay([1, 3], 2)).toEqual([1, 2, 3])
    expect(toggleDay([1, 2, 3], 2)).toEqual([1, 3])
  })
})

describe('campaignTargetLabel', () => {
  it('uses audience count for targeted templates', () => {
    expect(
      campaignTargetLabel(campaign({
        template_id: 'bring_back_customers',
        audience_count: 1,
      })),
    ).toBe('1 customer')
  })

  it('returns all customers for schedule templates', () => {
    expect(campaignTargetLabel(campaign({ template_id: 'happy_hour' }))).toBe('All customers')
  })
})

describe('campaignCriteriaChips', () => {
  it('shows lifetime stamp threshold for vip campaigns', () => {
    expect(
      campaignCriteriaChips(campaign({
        template_id: 'vip_rewards',
        config: { min_lifetime_stamps: 5, min_rewards_claimed: 1 },
      })),
    ).toEqual(['5+ lifetime stamps', '1+ reward claimed'])
  })

  it('falls back to legacy min_visits config', () => {
    expect(
      campaignCriteriaChips(campaign({
        template_id: 'vip_rewards',
        config: { min_visits: 5, min_rewards_claimed: 2 },
      })),
    ).toEqual(['5+ lifetime stamps', '2+ reward claimed'])
  })

  it('describes bring-back inactivity window', () => {
    expect(
      campaignCriteriaChips(campaign({
        template_id: 'bring_back_customers',
        config: { inactive_days: 30, duration_days: 14 },
      })),
    ).toEqual(['30+ days inactive', '14 day run'])
  })
})

describe('campaignShowsDayRow', () => {
  it('is true for quiet day and happy hour only', () => {
    expect(campaignShowsDayRow(campaign({ template_id: 'quiet_day_promotion' }))).toBe(true)
    expect(campaignShowsDayRow(campaign({ template_id: 'happy_hour' }))).toBe(true)
    expect(campaignShowsDayRow(campaign({ template_id: 'vip_rewards' }))).toBe(false)
  })
})

describe('campaignActiveDays', () => {
  it('returns sorted iso weekdays', () => {
    expect(campaignActiveDays(campaign({ config: { days_of_week: [3, 1, 2] } }))).toEqual([1, 2, 3])
  })
})

describe('campaignTimeRange', () => {
  it('formats happy hour window', () => {
    expect(
      campaignTimeRange(campaign({
        template_id: 'happy_hour',
        config: { start_time: '15:00', end_time: '18:00' },
      })),
    ).toBe('15:00 – 18:00')
  })

  it('returns null for non happy-hour templates', () => {
    expect(campaignTimeRange(campaign({ template_id: 'quiet_day_promotion' }))).toBeNull()
  })
})

describe('campaignMultiplier', () => {
  it('prefers enriched multiplier over config fallback', () => {
    expect(campaignMultiplier(campaign({ multiplier: 3, config: { stamp_multiplier: 2 } }))).toBe(3)
    expect(campaignMultiplier(campaign({ config: { stamp_multiplier: 2 } }))).toBe(2)
  })
})
