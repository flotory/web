import { describe, expect, it } from 'vitest'

import {
  dashboardPeriodQueryString,
  defaultDashboardPeriodSelection,
  parseDashboardPeriodFromQuery,
  previousPeriodComparisonLabel,
} from '@/lib/dashboardPeriod'

describe('dashboardPeriod helpers', () => {
  it('defaults to 28 days when no query params', () => {
    expect(parseDashboardPeriodFromQuery({})).toEqual(defaultDashboardPeriodSelection())
    expect(dashboardPeriodQueryString(defaultDashboardPeriodSelection())).toBe('')
  })

  it('serializes preset and custom ranges for the API', () => {
    expect(dashboardPeriodQueryString({ preset: '6m' }, 12)).toBe('?venue_id=12&period=6m')
    expect(dashboardPeriodQueryString({ preset: 'custom', from: '2026-01-01', to: '2026-03-01' }, 3))
      .toBe('?venue_id=3&from=2026-01-01&to=2026-03-01')
  })

  it('builds trend comparison labels from the selected period', () => {
    expect(previousPeriodComparisonLabel({ preset: '28d', from: '2026-06-06', to: '2026-07-03', label: 'Last 28 days', days: 28 }))
      .toBe('vs previous 28 days')
    expect(previousPeriodComparisonLabel({ preset: '6m', from: '2026-01-04', to: '2026-07-03', label: 'Last 6 months', days: 181 }))
      .toBe('vs previous 6 months')
    expect(previousPeriodComparisonLabel({ preset: null, from: '2026-01-01', to: '2026-01-31', label: 'Jan 2026', days: 31 }))
      .toBe('vs previous 31 days')
  })
})
