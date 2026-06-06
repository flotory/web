import { api, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Campaign } from '@/lib/campaignTemplates'

export async function updateCampaignStatus(
  venueId: number,
  campaign: Campaign,
  status: Campaign['status'],
  onSuccess?: () => Promise<void> | void,
): Promise<boolean> {
  try {
    await api(`/venues/${venueId}/campaigns/${campaign.id}`, {
      method: 'PATCH',
      body: { status },
    })
    toast.success('Campaign updated')
    await onSuccess?.()
    return true
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not update campaign.'))
    return false
  }
}
