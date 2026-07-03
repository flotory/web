export type DashboardPeriodPreset = '7d' | '14d' | '28d' | '2m' | '3m' | '6m' | '12m' | 'custom'

export interface DashboardPeriodSelection {
  preset: DashboardPeriodPreset
  from?: string
  to?: string
}

export interface DashboardPeriodMeta {
  preset: string | null
  from: string
  to: string
  label: string
  days: number
}

export const DEFAULT_DASHBOARD_PERIOD_PRESET: DashboardPeriodPreset = '28d'

export const DASHBOARD_PERIOD_PRESETS: Array<{ id: Exclude<DashboardPeriodPreset, 'custom'>; label: string; shortLabel: string }> = [
  { id: '7d', label: '7 days', shortLabel: '7d' },
  { id: '14d', label: '14 days', shortLabel: '14d' },
  { id: '28d', label: '28 days', shortLabel: '28d' },
  { id: '2m', label: '2 months', shortLabel: '2mo' },
  { id: '3m', label: '3 months', shortLabel: '3mo' },
  { id: '6m', label: '6 months', shortLabel: '6mo' },
  { id: '12m', label: '12 months', shortLabel: '12mo' },
]

export function defaultDashboardPeriodSelection(): DashboardPeriodSelection {
  return { preset: DEFAULT_DASHBOARD_PERIOD_PRESET }
}

export function parseDashboardPeriodFromQuery(query: Record<string, unknown>): DashboardPeriodSelection {
  const from = typeof query.from === 'string' ? query.from : ''
  const to = typeof query.to === 'string' ? query.to : ''

  if (from && to) {
    return { preset: 'custom', from, to }
  }

  const period = typeof query.period === 'string' ? query.period : ''
  const preset = DASHBOARD_PERIOD_PRESETS.find((option) => option.id === period)?.id

  return { preset: preset ?? DEFAULT_DASHBOARD_PERIOD_PRESET }
}

export function dashboardPeriodQueryString(
  selection: DashboardPeriodSelection,
  venueId?: number | null,
): string {
  const params = new URLSearchParams()

  if (venueId) {
    params.set('venue_id', String(venueId))
  }

  if (selection.preset === 'custom' && selection.from && selection.to) {
    params.set('from', selection.from)
    params.set('to', selection.to)
  } else if (selection.preset !== DEFAULT_DASHBOARD_PERIOD_PRESET) {
    params.set('period', selection.preset)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function dashboardApiQueryString(selection: DashboardPeriodSelection, venueId?: number | null): string {
  return dashboardPeriodQueryString(selection, venueId)
}

export function periodSelectionLabel(selection: DashboardPeriodSelection): string {
  if (selection.preset === 'custom' && selection.from && selection.to) {
    return formatDateRangeLabel(selection.from, selection.to)
  }

  return DASHBOARD_PERIOD_PRESETS.find((option) => option.id === selection.preset)?.label ?? 'Selected period'
}

/** Label for KPI trend footnotes — matches the prior window of equal length on the backend. */
export function previousPeriodComparisonLabel(period?: DashboardPeriodMeta | null): string {
  if (!period) {
    return 'vs previous period'
  }

  const preset = period.preset
  if (preset && preset !== 'custom') {
    const match = DASHBOARD_PERIOD_PRESETS.find((option) => option.id === preset)
    if (match) {
      return `vs previous ${match.label}`
    }
  }

  if (period.days <= 35) {
    return `vs previous ${period.days} days`
  }

  const approximateMonths = Math.max(1, Math.round(period.days / 30))
  if (period.days <= 400) {
    return `vs previous ${approximateMonths} months`
  }

  return `vs previous ${period.days} days`
}

export function formatDateRangeLabel(from: string, to: string): string {
  const start = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Custom range'
  }

  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  if (from === to) {
    return formatter.format(start)
  }

  return `${formatter.format(start)} – ${formatter.format(end)}`
}

export function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
