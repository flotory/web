import type { Campaign, CampaignStatus } from '@/lib/campaignTemplates'

export type CampaignHistoryFilter = 'all' | CampaignStatus
export type CampaignHistorySort = 'newest' | 'oldest'

export function filterCampaigns(campaigns: Campaign[], filter: CampaignHistoryFilter): Campaign[] {
  if (filter === 'all') {
    return campaigns
  }

  return campaigns.filter((row) => row.status === filter)
}

export function sortCampaigns(campaigns: Campaign[], sort: CampaignHistorySort): Campaign[] {
  return [...campaigns].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime()
    const rightTime = new Date(right.created_at).getTime()

    return sort === 'newest' ? rightTime - leftTime : leftTime - rightTime
  })
}

export function campaignMetaLine(campaign: Campaign): string {
  const parts = campaignMetaParts(campaign)

  return parts.join(' · ')
}

export function campaignMetaParts(campaign: Campaign): string[] {
  const parts: string[] = []

  const schedule = formatScheduleLine(campaign)
  if (schedule) {
    parts.push(schedule)
  }

  parts.push(`${campaign.multiplier ?? campaign.config.stamp_multiplier ?? 2}× stamps`)
  parts.push(`${campaign.audience_count} customers`)

  return parts
}

function formatScheduleLine(campaign: Campaign): string | null {
  const chips = campaign.schedule_chips ?? []
  if (chips.length === 0) {
    return campaign.schedule_summary ?? null
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const days = chips.filter((chip) => dayLabels.includes(chip))
  const timeChip = chips.find((chip) => chip.includes('–') || chip.includes('AM') || chip.includes('PM'))
  const other = chips.filter((chip) => !days.includes(chip) && chip !== timeChip)

  if (days.length === 7) {
    return timeChip ? `Every day, ${timeChip}` : 'Every day'
  }

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  if (days.length === 5 && weekdays.every((day) => days.includes(day))) {
    return timeChip ? `Mon – Fri, ${timeChip}` : 'Mon – Fri'
  }

  if (days.length > 0) {
    const joined = days.join(', ')
    return timeChip ? `${joined}, ${timeChip}` : joined
  }

  return other.join(', ') || null
}

export function campaignTimelineLabel(campaign: Campaign): string {
  const reference = timelineReference(campaign)
  const relative = formatRelativeTime(reference)

  switch (campaign.status) {
    case 'active':
      return `Started ${relative}`
    case 'paused':
      return `Paused ${relative}`
    case 'ended':
      return `Ended ${relative}`
    default:
      return `Created ${relative}`
  }
}

function timelineReference(campaign: Campaign): string {
  if (campaign.status === 'active') {
    return campaign.activated_at ?? campaign.created_at
  }

  if (campaign.status === 'ended' && campaign.ends_at) {
    return campaign.ends_at
  }

  return campaign.updated_at
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diffSeconds = Math.round((date.getTime() - now) / 1000)
  const absSeconds = Math.abs(diffSeconds)

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]

  for (const [unit, secondsInUnit] of units) {
    if (absSeconds >= secondsInUnit || unit === 'minute') {
      const value = Math.round(diffSeconds / secondsInUnit)
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(value, unit)
    }
  }

  return 'just now'
}
