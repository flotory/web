import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { api, apiErrorMessage } from '@/lib/api'
import {
  filterCampaigns,
  sortCampaigns,
  type CampaignHistoryFilter,
  type CampaignHistorySort,
} from '@/lib/campaignHistory'
import type { Campaign, CampaignTemplate, CampaignTemplateId } from '@/lib/campaignTemplates'
import { toast } from '@/lib/toast'
import { useWorkspaceStore } from '@/stores/workspace'

export function useCampaignsPage() {
  const route = useRoute()
  const router = useRouter()
  const workspace = useWorkspaceStore()

  const templates = ref<CampaignTemplate[]>([])
  const campaigns = ref<Campaign[]>([])
  const loading = ref(true)
  const error = ref('')
  const historyFilter = ref<CampaignHistoryFilter>('all')
  const historySort = ref<CampaignHistorySort>('newest')
  const wizardOpen = ref(false)
  const wizardTemplateId = ref<CampaignTemplateId | null>(null)
  const editingCampaign = ref<Campaign | null>(null)

  const hasVenue = computed(() => workspace.effectiveVenueId != null)

  const activeCampaigns = computed(() => campaigns.value.filter((row) => row.status === 'active'))

  const historyTabs: Array<{ id: CampaignHistoryFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'paused', label: 'Paused' },
    { id: 'ended', label: 'Ended' },
  ]

  const historyCampaigns = computed(() => {
    const visible = campaigns.value.filter((row) => row.status !== 'draft')

    return sortCampaigns(filterCampaigns(visible, historyFilter.value), historySort.value)
  })

  async function loadPage() {
    loading.value = true
    error.value = ''

    try {
      await workspace.bootstrap()
      const venueId = workspace.effectiveVenueId
      if (!venueId) {
        templates.value = []
        campaigns.value = []
        return
      }

      const response = await api<{
        templates: CampaignTemplate[]
        campaigns: Campaign[]
      }>(`/venues/${venueId}/campaigns`)

      templates.value = response.templates
      campaigns.value = response.campaigns
    } catch (exception) {
      error.value = apiErrorMessage(exception, 'Could not load campaigns.')
    } finally {
      loading.value = false
    }
  }

  function openCreate(templateId: CampaignTemplateId) {
    editingCampaign.value = null
    wizardTemplateId.value = templateId
    wizardOpen.value = true
  }

  function openEdit(campaign: Campaign) {
    editingCampaign.value = campaign
    wizardTemplateId.value = campaign.template_id
    wizardOpen.value = true
  }

  function closeWizard() {
    wizardOpen.value = false
    wizardTemplateId.value = null
    editingCampaign.value = null
  }

  async function updateStatus(campaign: Campaign, status: Campaign['status']) {
    const venueId = workspace.effectiveVenueId
    if (!venueId) return

    try {
      await api(`/venues/${venueId}/campaigns/${campaign.id}`, {
        method: 'PATCH',
        body: { status },
      })
      toast.success('Campaign updated')
      await loadPage()
    } catch (exception) {
      toast.error(apiErrorMessage(exception, 'Could not update campaign.'))
    }
  }

  function prefillFromQuery() {
    const templateId = route.query.template as CampaignTemplateId | undefined
    if (!templateId || !hasVenue.value) return
    openCreate(templateId)
    void router.replace({ query: { ...route.query, template: undefined } })
  }

  watch(() => workspace.filterVenueId, loadPage)
  onMounted(async () => {
    await loadPage()
    prefillFromQuery()
  })

  return {
    workspace,
    templates,
    campaigns,
    loading,
    error,
    historyFilter,
    historySort,
    wizardOpen,
    wizardTemplateId,
    editingCampaign,
    hasVenue,
    activeCampaigns,
    historyTabs,
    historyCampaigns,
    loadPage,
    openCreate,
    openEdit,
    closeWizard,
    updateStatus,
  }
}
