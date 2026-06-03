import type { Component } from 'vue'
import { Award, CalendarDays, Clock3, UsersRound } from '@lucide/vue'

export type CampaignTemplateId =
  | 'bring_back_customers'
  | 'quiet_day_promotion'
  | 'happy_hour'
  | 'vip_rewards'

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended'

export type CampaignIconTone = 'slate' | 'amber' | 'emerald' | 'violet' | 'sky' | 'indigo'

export interface CampaignConfig {
  stamp_multiplier?: number
  inactive_days?: number
  duration_days?: number
  days_of_week?: number[]
  start_time?: string
  end_time?: string
  min_visits?: number
  min_rewards_claimed?: number
}

export interface Campaign {
  id: number
  venue_id: number
  template_id: CampaignTemplateId
  name: string
  status: CampaignStatus
  starts_at: string | null
  ends_at: string | null
  config: CampaignConfig
  push_enabled: boolean
  audience_count: number
  activated_at: string | null
  created_at: string
  updated_at: string
  multiplier?: number
  schedule_chips?: string[]
  schedule_summary?: string
  status_label?: string
  summary?: string
}

export interface CampaignTemplate {
  template_id: CampaignTemplateId
  name: string
  description: string
  benefit: string
  cta_label: string
  push_message: string
  config: CampaignConfig
  audience_count?: number
  target_label?: string
}

export interface CampaignPreview {
  name: string
  template_id: CampaignTemplateId
  audience_count: number
  multiplier: number
  schedule_chips: string[]
  schedule_summary: string
  summary: string
  push_enabled: boolean
}

export interface CampaignRecommendation {
  template_id: CampaignTemplateId
  icon: 'warning' | 'chart' | 'star'
  title: string
  cta_label: string
  audience_count: number
}

export const WEEKDAYS: Array<{ iso: number; label: string; short: string }> = [
  { iso: 1, label: 'Monday', short: 'Mon' },
  { iso: 2, label: 'Tuesday', short: 'Tue' },
  { iso: 3, label: 'Wednesday', short: 'Wed' },
  { iso: 4, label: 'Thursday', short: 'Thu' },
  { iso: 5, label: 'Friday', short: 'Fri' },
  { iso: 6, label: 'Saturday', short: 'Sat' },
  { iso: 7, label: 'Sunday', short: 'Sun' },
]

export const campaignTemplateMeta: Record<
  CampaignTemplateId,
  { icon: Component; tone: CampaignIconTone; tagline: string }
> = {
  bring_back_customers: {
    icon: UsersRound,
    tone: 'emerald',
    tagline: 'Win back inactive guests',
  },
  quiet_day_promotion: {
    icon: CalendarDays,
    tone: 'violet',
    tagline: 'Boost quiet days',
  },
  happy_hour: {
    icon: Clock3,
    tone: 'sky',
    tagline: 'Fill afternoon visits',
  },
  vip_rewards: {
    icon: Award,
    tone: 'amber',
    tagline: 'Reward your regulars',
  },
}

export function defaultConfigFor(templateId: CampaignTemplateId): CampaignConfig {
  switch (templateId) {
    case 'bring_back_customers':
      return { stamp_multiplier: 2, inactive_days: 30, duration_days: 14 }
    case 'quiet_day_promotion':
      return { stamp_multiplier: 2, days_of_week: [1, 2, 3], duration_days: 30 }
    case 'happy_hour':
      return {
        stamp_multiplier: 2,
        days_of_week: [1, 2, 3, 4, 5],
        start_time: '15:00',
        end_time: '18:00',
      }
    case 'vip_rewards':
      return { stamp_multiplier: 2, min_visits: 5, min_rewards_claimed: 1 }
  }
}

export function defaultNameFor(templateId: CampaignTemplateId, templates: CampaignTemplate[]): string {
  return templates.find((row) => row.template_id === templateId)?.name ?? 'Campaign'
}

export function campaignTemplateIcon(templateId: CampaignTemplateId): Component {
  return campaignTemplateMeta[templateId].icon
}

export function campaignTemplateTone(templateId: CampaignTemplateId): CampaignIconTone {
  return campaignTemplateMeta[templateId].tone
}

export function campaignStatusLabel(status: CampaignStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'active':
      return 'Running'
    case 'paused':
      return 'Paused'
    case 'ended':
      return 'Ended'
  }
}

export function campaignStatusTone(status: CampaignStatus): 'slate' | 'green' | 'amber' | 'blue' {
  switch (status) {
    case 'active':
      return 'green'
    case 'paused':
      return 'amber'
    case 'ended':
      return 'slate'
    default:
      return 'blue'
  }
}

export function multiplierLabel(multiplier: number): string {
  return `${multiplier}× stamps`
}

export function toggleDay(days: number[], iso: number): number[] {
  const set = new Set(days)
  if (set.has(iso)) {
    set.delete(iso)
  } else {
    set.add(iso)
  }
  return [...set].sort((a, b) => a - b)
}
