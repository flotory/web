<script setup lang="ts">
import { Megaphone, Plus, Store } from '@lucide/vue'

import CampaignActiveCard from '@/components/campaigns/CampaignActiveCard.vue'
import CampaignHistoryRow from '@/components/campaigns/CampaignHistoryRow.vue'
import CampaignIcon from '@/components/campaigns/CampaignIcon.vue'
import CampaignWizard from '@/components/campaigns/CampaignWizard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import PageSection from '@/components/ui/PageSection.vue'
import { useCampaignsPage } from '@/composables/useCampaignsPage'
import AppShell from '@/layouts/AppShell.vue'
import {
  campaignTemplateIcon,
  campaignTemplateMeta,
  campaignTemplateTone,
} from '@/lib/campaignTemplates'
import { cn } from '@/lib/utils'

const {
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
} = useCampaignsPage()
</script>

<template>
  <AppShell>
    <div class="space-y-8 pb-10">
      <PageHeader
        title="Campaigns"
        badge="Stamp bonuses"
        description="Run multiple campaigns. Customers receive the highest eligible multiplier — bonuses never stack together."
      />

      <div v-if="!hasVenue && !loading" class="rounded-3xl border border-dashed border-border p-8">
        <EmptyState :icon="Store" title="Select a venue" description="Choose a venue in the sidebar filter to manage campaigns." />
      </div>

      <ErrorState v-else-if="error" :message="error" @retry="loadPage" />

      <template v-else-if="hasVenue">
        <section>
          <PageSection title="Active campaigns" description="Stamp bonuses currently turned on for your venue." />

          <div v-if="loading" class="mt-5 grid gap-4 sm:grid-cols-2">
            <div v-for="index in 2" :key="index" class="h-40 animate-pulse rounded-3xl bg-surface-muted" />
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
            class="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted/80 px-4 py-6 text-center text-sm font-semibold text-ink-muted"
          >
            No active campaigns. Create one below to boost visits.
          </p>
        </section>

        <section>
          <PageSection title="Create campaign" description="Pick a template — setup takes under a minute." />

          <div v-if="loading" class="mt-5 grid gap-4 sm:grid-cols-2">
            <div v-for="index in 4" :key="index" class="h-36 animate-pulse rounded-3xl bg-surface-muted" />
          </div>

          <div v-else class="mt-5 grid gap-4 sm:grid-cols-2">
            <button
              v-for="template in templates"
              :key="template.template_id"
              type="button"
              class="group flex flex-col rounded-3xl border border-border bg-surface p-5 text-left shadow-sm transition hover:border-border hover:shadow-md"
              @click="openCreate(template.template_id)"
            >
              <div class="flex items-start justify-between gap-3">
                <CampaignIcon
                  :icon="campaignTemplateIcon(template.template_id)"
                  :tone="campaignTemplateTone(template.template_id)"
                  size="lg"
                />
                <span
                  class="grid size-10 place-items-center rounded-full bg-surface-muted text-ink-muted transition group-hover:bg-primary group-hover:text-white"
                >
                  <Plus class="size-5" />
                </span>
              </div>
              <h3 class="mt-4 text-lg font-black text-ink">{{ template.name }}</h3>
              <p class="mt-1 text-sm text-ink-muted">{{ campaignTemplateMeta[template.template_id].tagline }}</p>
              <p class="mt-3 text-xs font-bold uppercase tracking-wide text-ink-soft">
                {{ template.audience_count }} in scope
              </p>
            </button>
          </div>
        </section>

        <section>
          <PageSection title="Campaign history" />

          <div class="mt-4 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            <div
              class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted/50 px-5 py-3"
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
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-ink-muted hover:bg-surface hover:text-ink',
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
                  class="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink outline-none ring-accent focus:ring-2"
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
                class="h-[4.75rem] border-b border-border bg-surface-muted/50 last:border-b-0"
              />
            </div>

            <ul v-else-if="historyCampaigns.length" class="divide-y divide-border">
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

            <p v-else class="px-5 py-14 text-center text-sm font-semibold text-ink-muted">
              <template v-if="campaigns.length === 0">No campaigns yet.</template>
              <template v-else>
                No {{ historyFilter === 'all' ? '' : historyFilter }} campaigns in this view.
              </template>
            </p>
          </div>
        </section>

        <div
          v-if="!loading && campaigns.length === 0"
          class="rounded-3xl border border-dashed border-border p-8"
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
