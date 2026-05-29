<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import StatCard from '@/components/loyalty/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api } from '@/lib/api'
import { hasTeamMembership } from '@/lib/venueRoles'
import { venueCoverUrl, venueLogoUrl } from '@/lib/venueMedia'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const cafes = ref<Venue[]>([])
const loading = ref(true)
const joiningId = ref<number | null>(null)
const error = ref('')
const isCustomer = computed(() => !auth.user?.is_admin && !hasTeamMembership(workspace.activeVenues))

async function loadCafes() {
  loading.value = true
  error.value = ''

  try {
    cafes.value = (await api<{ venues: Venue[] }>('/venues/discover')).venues
  } catch {
    error.value = 'Could not load cafes.'
  } finally {
    loading.value = false
  }
}

async function joinCafe(cafe: Venue) {
  joiningId.value = cafe.id
  error.value = ''

  try {
    await api(`/venues/${cafe.slug}/join`, { method: 'POST' })
    await loadCafes()
  } catch {
    error.value = `Could not join ${cafe.name}.`
  } finally {
    joiningId.value = null
  }
}

onMounted(loadCafes)
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="blue">{{ isCustomer ? 'Explore cafes' : 'Demo cafes' }}</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Cafes</h1>
      <p class="mt-2 text-slate-500">
        {{ isCustomer ? 'Join cafes and open the right loyalty card for each place.' : 'Seeded restaurant workspaces with customers, visits, and rewards.' }}
      </p>
    </div>

    <AppCard v-if="loading" wrapper-class="mb-4">
      <p class="text-sm font-bold text-slate-500">Loading cafes...</p>
    </AppCard>
    <AppCard v-else-if="error" wrapper-class="mb-4">
      <p class="text-sm font-bold text-red-600">{{ error }}</p>
    </AppCard>

    <div class="grid gap-4 md:grid-cols-2">
      <AppCard v-for="cafe in cafes" :key="cafe.id" wrapper-class="overflow-hidden p-0">
        <img :src="venueCoverUrl(cafe)" alt="" class="h-28 w-full object-cover">
        <div class="p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white text-lg font-black shadow-sm ring-2 ring-white -mt-10">
              <img :src="venueLogoUrl(cafe)" :alt="cafe.name" class="size-full object-cover">
            </div>
            <div>
              <h2 class="text-2xl font-black text-slate-950">{{ cafe.name }}</h2>
              <p class="mt-1 text-sm font-semibold text-slate-500">/{{ cafe.slug }}</p>
              <p v-if="cafe.address" class="mt-2 text-sm font-semibold text-slate-500">{{ cafe.address }}</p>
            </div>
          </div>
          <AppBadge :tone="cafe.joined_count ? 'green' : 'blue'">
            {{ isCustomer ? (cafe.joined_count ? 'Joined' : 'Available') : 'Active' }}
          </AppBadge>
        </div>

        <div class="mt-5 grid grid-cols-3 gap-3">
          <StatCard label="Customers" :value="cafe.customers_count ?? 0" />
          <StatCard label="Visits" :value="cafe.visits_count ?? 0" />
          <StatCard label="Rewards" :value="cafe.rewards_count ?? 0" />
        </div>

        <div v-if="isCustomer" class="mt-5 grid gap-3 sm:grid-cols-2">
          <RouterLink v-if="cafe.joined_count" :to="`/card?venue_id=${cafe.id}`">
            <AppButton class="w-full">Open card</AppButton>
          </RouterLink>
          <AppButton v-else class="w-full" :disabled="joiningId === cafe.id" @click="joinCafe(cafe)">
            {{ joiningId === cafe.id ? 'Joining...' : 'Join cafe' }}
          </AppButton>
        </div>
        </div>
      </AppCard>
    </div>
  </AppShell>
</template>
