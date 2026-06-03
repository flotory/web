<script setup lang="ts">
import { Megaphone, Plus, Store } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CampaignActiveCard from '@/components/campaigns/CampaignActiveCard.vue'
import CampaignHistoryRow from '@/components/campaigns/CampaignHistoryRow.vue'
import CampaignIcon from '@/components/campaigns/CampaignIcon.vue'
import CampaignWizard from '@/components/campaigns/CampaignWizard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import {
  filterCampaigns,
  sortCampaigns,
  type CampaignHistoryFilter,
  type CampaignHistorySort,
} from '@/lib/campaignHistory'
import {
  campaignTemplateIcon,
  campaignTemplateMeta,
  campaignTemplateTone,
  type Campaign,
  type CampaignTemplate,
  type CampaignTemplateId,
} from '@/lib/campaignTemplates'
import { toast } from '@/lib/toast'
import { useWorkspaceStore } from '@/stores/workspace'
import { cn } from '@/lib/utils'

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
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-5xl space-y-10 pb-16">
      <header>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Loyalty</p>
        <h1 class="mt-2 text-3xl font-black text-slate-900">Campaigns</h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Run multiple campaigns. Customers receive the
          <strong class="font-semibold text-slate-800">highest eligible multiplier</strong> — bonuses never stack together.
        </p>
      </header>

      <div v-if="!hasVenue && !loading" class="rounded-3xl border border-dashed border-slate-300 p-8">
        <EmptyState :icon="Store" title="Select a venue" description="Choose a venue in the header to manage campaigns." />
      </div>

      <ErrorState v-else-if="error" :message="error" @retry="loadPage" />

      <template v-else-if="hasVenue">
        <section>
          <div>
            <h2 class="text-xl font-black text-slate-950">Active campaigns</h2>
            <p class="mt-1 text-sm text-slate-500">Stamp bonuses currently turned on for your venue.</p>
          </div>

          <div v-if="loading" class="mt-5 grid gap-4 sm:grid-cols-2">
            <div v-for="index in 2" :key="index" class="h-40 animate-pulse rounded-3xl bg-slate-100" />
          </div>

          <div v-else-if="activeCampaigns.length" class="mt-5 grid items-stretch gap-4 sm:grid-cols-2">
            <CampaignActiveCard
              v-for="campaign in activeCampaigns"
              :key="campaign.id"
              :campaign="campaign"
              @pause="updateStatus(campaign, 'paused')"
              @edit="openEdit(campaign)"
              @end="updateStatus(campaign, 'ended')"
            />
          </div>

          <p
            v-else
            class="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm font-semibold text-slate-500"
          >
            No active campaigns. Create one below to boost visits.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-black text-slate-950">Create campaign</h2>
          <p class="mt-1 text-sm text-slate-500">Pick a template — setup takes under a minute.</p>

          <div v-if="loading" class="mt-5 grid gap-4 sm:grid-cols-2">
            <div v-for="index in 4" :key="index" class="h-36 animate-pulse rounded-3xl bg-slate-100" />
          </div>

          <div v-else class="mt-5 grid gap-4 sm:grid-cols-2">
            <button
              v-for="template in templates"
              :key="template.template_id"
              type="button"
              class="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
              @click="openCreate(template.template_id)"
            >
              <div class="flex items-start justify-between gap-3">
                <CampaignIcon
                  :icon="campaignTemplateIcon(template.template_id)"
                  :tone="campaignTemplateTone(template.template_id)"
                  size="lg"
                />
                <span
                  class="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition group-hover:bg-slate-950 group-hover:text-white"
                >
                  <Plus class="size-5" />
                </span>
              </div>
              <h3 class="mt-4 text-lg font-black text-slate-950">{{ template.name }}</h3>
              <p class="mt-1 text-sm text-slate-600">{{ campaignTemplateMeta[template.template_id].tagline }}</p>
              <p class="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                {{ template.audience_count }} in scope
              </p>
            </button>
          </div>
        </section>

        <section>
          <div class="flex flex-wrap items-end justify-between gap-4">
            <h2 class="text-xl font-black text-slate-950">Campaign history</h2>
          </div>

          <div class="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div
              class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3"
            >
              <div class="flex gap-1 sm:gap-2">
                <button
                  v-for="tab in historyTabs"
                  :key="tab.id"
                  type="button"
                  :class="
                    cn(
                      'rounded-full px-3.5 py-1.5 text-sm font-bold transition',
                      historyFilter === tab.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900',
                    )
                  "
                  @click="historyFilter = tab.id"
                >
                  {{ tab.label }}
                </button>
              </div>
              <label class="flex items-center gap-2">
                <span class="sr-only">Sort campaigns</span>
                <select
                  v-model="historySort"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none ring-indigo-500 focus:ring-2"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>

            <div v-if="loading">
              <div
                v-for="index in 4"
                :key="index"
                class="h-[4.75rem] border-b border-slate-100 bg-slate-50/50 last:border-b-0"
              />
            </div>

            <ul v-else-if="historyCampaigns.length" class="divide-y divide-slate-100">
              <li v-for="campaign in historyCampaigns" :key="campaign.id" class="last:divide-none">
                <CampaignHistoryRow
                  :campaign="campaign"
                  @pause="updateStatus(campaign, 'paused')"
                  @activate="updateStatus(campaign, 'active')"
                  @edit="openEdit(campaign)"
                  @end="updateStatus(campaign, 'ended')"
                />
              </li>
            </ul>

            <p v-else class="px-5 py-14 text-center text-sm font-semibold text-slate-500">
              <template v-if="campaigns.length === 0">No campaigns yet.</template>
              <template v-else>
                No {{ historyFilter === 'all' ? '' : historyFilter }} campaigns in this view.
              </template>
            </p>
          </div>
        </section>

        <div
          v-if="!loading && campaigns.length === 0"
          class="rounded-3xl border border-dashed border-slate-300 p-8"
        >
          <EmptyState
            :icon="Megaphone"
            title="No campaigns yet"
            description="Create your first campaign to bring customers back with bonus stamps."
          />
        </div>
      </template>
    </div>

    <CampaignWizard
      v-if="wizardOpen && wizardTemplateId && workspace.effectiveVenueId"
      :open="wizardOpen"
      :venue-id="workspace.effectiveVenueId"
      :template-id="wizardTemplateId"
      :templates="templates"
      :editing="editingCampaign"
      @close="closeWizard"
      @saved="loadPage"
    />
  </AppShell>
</template>
