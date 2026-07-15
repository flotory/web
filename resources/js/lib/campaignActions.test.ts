import { beforeEach, describe, expect, it, vi } from 'vitest'

import { updateCampaignStatus } from './campaignActions'
import type { Campaign } from './campaignTemplates'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
}))

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

const campaign: Campaign = {
  id: 7,
  venue_id: 3,
  template_id: 'happy_hour',
  name: 'Happy Hour',
  status: 'draft',
  starts_at: null,
  ends_at: null,
  config: { stamp_multiplier: 2 },
  push_enabled: false,
  audience_count: 12,
  activated_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('updateCampaignStatus', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it('patches campaign status and shows success toast', async () => {
    vi.mocked(api).mockResolvedValue({})
    const onSuccess = vi.fn()

    const ok = await updateCampaignStatus(3, campaign, 'active', onSuccess)

    expect(ok).toBe(true)
    expect(api).toHaveBeenCalledWith('/venues/3/campaigns/7', {
      method: 'PATCH',
      body: { status: 'active' },
    })
    expect(toast.success).toHaveBeenCalledWith('Campaign updated')
    expect(onSuccess).toHaveBeenCalled()
  })

  it('returns false and shows error toast on failure', async () => {
    vi.mocked(api).mockRejectedValue(new Error('network'))

    const ok = await updateCampaignStatus(3, campaign, 'paused')

    expect(ok).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Could not update campaign.')
  })
})
