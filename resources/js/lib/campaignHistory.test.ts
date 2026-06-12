import { describe, expect, it } from 'vitest'

import {
  campaignMetaLine,
  campaignMetaParts,
  campaignTimelineLabel,
  filterCampaigns,
  sortCampaigns,
} from '@/lib/campaignHistory'
import type { Campaign } from '@/lib/campaignTemplates'

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
    multiplier: 2,
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-02T10:00:00Z',
    activated_at: '2026-06-02T10:00:00Z',
    ...overrides,
  }
}

describe('filterCampaigns', () => {
  const rows = [
    campaign({ id: 1, status: 'active' }),
    campaign({ id: 2, status: 'ended' }),
    campaign({ id: 3, status: 'paused' }),
  ]

  it('returns all campaigns when filter is all', () => {
    expect(filterCampaigns(rows, 'all')).toHaveLength(3)
  })

  it('filters by status', () => {
    expect(filterCampaigns(rows, 'ended').map((row) => row.id)).toEqual([2])
    expect(filterCampaigns(rows, 'paused').map((row) => row.id)).toEqual([3])
  })
})

describe('sortCampaigns', () => {
  const rows = [
    campaign({ id: 1, created_at: '2026-06-01T10:00:00Z' }),
    campaign({ id: 2, created_at: '2026-06-03T10:00:00Z' }),
    campaign({ id: 3, created_at: '2026-06-02T10:00:00Z' }),
  ]

  it('sorts newest first', () => {
    expect(sortCampaigns(rows, 'newest').map((row) => row.id)).toEqual([2, 3, 1])
  })

  it('sorts oldest first', () => {
    expect(sortCampaigns(rows, 'oldest').map((row) => row.id)).toEqual([1, 3, 2])
  })
})

describe('campaignMetaLine', () => {
  it('includes multiplier and audience', () => {
    const line = campaignMetaLine(
      campaign({
        schedule_chips: ['Mon', 'Tue', 'Wed'],
        audience_count: 42,
        multiplier: 3,
        config: { stamp_multiplier: 3, days_of_week: [1, 2, 3] },
      }),
    )

    expect(line).toContain('3× stamps')
    expect(line).toContain('42 customers')
    expect(line).toContain('Mon')
  })

  it('formats every-day and weekday schedules with optional time chips', () => {
    expect(
      campaignMetaParts(
        campaign({
          schedule_chips: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', '9 AM – 5 PM'],
        }),
      )[0],
    ).toBe('Every day, 9 AM – 5 PM')

    expect(
      campaignMetaParts(
        campaign({
          schedule_chips: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        }),
      )[0],
    ).toBe('Mon – Fri')
  })

  it('falls back to schedule_summary when chips are empty', () => {
    expect(
      campaignMetaParts(
        campaign({
          schedule_chips: [],
          schedule_summary: 'Weekends only',
        }),
      )[0],
    ).toBe('Weekends only')
  })
})

describe('campaignTimelineLabel', () => {
  it('labels active, paused, and ended campaigns from the right timestamp', () => {
    expect(campaignTimelineLabel(campaign({ status: 'active', activated_at: '2026-06-01T10:00:00Z' }))).toMatch(
      /^Started /,
    )
    expect(campaignTimelineLabel(campaign({ status: 'paused', updated_at: '2026-06-02T10:00:00Z' }))).toMatch(
      /^Paused /,
    )
    expect(
      campaignTimelineLabel(
        campaign({ status: 'ended', ends_at: '2026-06-03T10:00:00Z', updated_at: '2026-06-04T10:00:00Z' }),
      ),
    ).toMatch(/^Ended /)
  })
})
