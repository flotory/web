<script setup lang="ts">
import { Copy, ExternalLink, Pencil, Plus, Store, UserPlus } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import WorkspaceSummaryCard from '@/components/loyalty/WorkspaceSummaryCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { normalizeVenueCategory } from '@/lib/defaultImages'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { toast } from '@/lib/toast'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

const router = useRouter()
const workspace = useWorkspaceStore()
const loading = ref(true)
const error = ref('')

const ownerVenues = computed(() =>
  workspace.activeVenues.filter((item) => item.membership_role === 'owner'),
)

const summary = computed(() => ({
  venues: ownerVenues.value.length,
  staff: ownerVenues.value.reduce((sum, venue) => sum + (venue.staff_count ?? 0), 0),
  customers: ownerVenues.value.reduce((sum, venue) => sum + (venue.customers_count ?? 0), 0),
  rewards: ownerVenues.value.reduce((sum, venue) => sum + (venue.rewards_count ?? 0), 0),
}))

function categoryLabel(venue: Venue): string {
  const type = normalizeVenueCategory(venue.category)
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function publicUrl(venue: Venue): string {
  return buildVenueLandingUrl(venue.slug)
}

async function copyPublicLink(venue: Venue) {
  try {
    await navigator.clipboard.writeText(publicUrl(venue))
    toast.success('Public link copied')
  } catch {
    toast.error('Could not copy link')
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await workspace.bootstrap(true)
  } catch {
    error.value = 'Could not load your workspace.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppShell>
    <div class="mb-8">
      <AppBadge tone="blue">Workspace</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-ink">Workspace overview</h1>
      <p class="mt-2 max-w-2xl text-ink-muted">
        A quick snapshot of your venues, team, and loyalty program — without the complexity of admin settings.
      </p>
    </div>

    <AppCard v-if="loading" wrapper-class="mb-6">
      <EmptyState compact title="Loading workspace…" />
    </AppCard>

    <ErrorState
      v-else-if="error"
      class="mb-6"
      :message="error"
      @retry="load"
    />

    <template v-else>
      <div v-if="!ownerVenues.length" class="rounded-3xl border border-dashed border-border bg-gradient-to-br from-surface-muted via-surface to-accent-soft/30 p-10 text-center">
        <EmptyState
          bare
          :icon="Store"
          title="Create your first venue"
          description="Add a café or restaurant to set up stamps, rewards, and your guest QR code."
        />
        <RouterLink to="/my-venues" class="mt-8 inline-block">
          <AppButton>
            <Plus class="size-4" :stroke-width="2.2" />
            Create your first venue
          </AppButton>
        </RouterLink>
      </div>

      <template v-else>
        <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <WorkspaceSummaryCard label="Venues" :value="summary.venues" />
          <WorkspaceSummaryCard label="Staff" :value="summary.staff" />
          <WorkspaceSummaryCard label="Customers" :value="summary.customers" />
          <WorkspaceSummaryCard label="Rewards" :value="summary.rewards" />
        </div>

        <AppCard wrapper-class="mb-6 p-5 sm:p-6">
          <h2 class="text-sm font-bold uppercase tracking-wide text-ink-soft">Quick actions</h2>
          <div class="mt-4 flex flex-wrap gap-3">
            <RouterLink to="/my-venues">
              <AppButton variant="secondary" class="gap-2">
                <Plus class="size-4" :stroke-width="2.2" />
                Create venue
              </AppButton>
            </RouterLink>
            <RouterLink to="/team">
              <AppButton variant="secondary" class="gap-2">
                <UserPlus class="size-4" :stroke-width="2.2" />
                Invite staff
              </AppButton>
            </RouterLink>
          </div>
        </AppCard>

        <div>
          <div class="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 class="text-xl font-black text-ink">Your venues</h2>
              <p class="mt-1 text-sm text-ink-muted">Manage branding, QR codes, and loyalty per location.</p>
            </div>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <article
              v-for="venue in ownerVenues"
              :key="venue.id"
              class="group rounded-2xl border border-border/80 bg-surface p-5 shadow-sm shadow-border/40 transition hover:border-border hover:shadow-md"
            >
              <div class="flex gap-4">
                <div class="size-14 shrink-0 overflow-hidden rounded-xl bg-surface-muted ring-1 ring-border/80">
                  <img
                    :src="venueLogoThumbUrl(venue)"
                    :alt="venue.name"
                    class="size-full object-cover"
                  >
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="truncate text-lg font-black text-ink">{{ venue.name }}</h3>
                    <AppBadge tone="slate">{{ categoryLabel(venue) }}</AppBadge>
                  </div>
                  <p class="mt-0.5 text-sm font-medium text-ink-muted">/{{ venue.slug }}</p>
                  <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                    <span><strong class="font-semibold text-ink">{{ venue.staff_count ?? 0 }}</strong> staff</span>
                    <span><strong class="font-semibold text-ink">{{ venue.customers_count ?? 0 }}</strong> customers</span>
                    <span><strong class="font-semibold text-ink">{{ venue.rewards_count ?? 0 }}</strong> rewards</span>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <AppButton
                  variant="secondary"
                  size="sm"
                  class="gap-1.5"
                  @click="router.push(`/my-venues/${venue.id}/settings`)"
                >
                  <Pencil class="size-3.5" :stroke-width="2.2" />
                  Edit venue
                </AppButton>
                <a
                  :href="publicUrl(venue)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex"
                >
                  <AppButton variant="ghost" size="sm" class="gap-1.5">
                    <ExternalLink class="size-3.5" :stroke-width="2.2" />
                    Open public page
                  </AppButton>
                </a>
                <AppButton variant="ghost" size="sm" class="gap-1.5" @click="copyPublicLink(venue)">
                  <Copy class="size-3.5" :stroke-width="2.2" />
                  Copy link
                </AppButton>
              </div>
            </article>
          </div>
        </div>
      </template>
    </template>
  </AppShell>
</template>
