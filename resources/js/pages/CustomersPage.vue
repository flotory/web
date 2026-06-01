<script setup lang="ts">
import { Users } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { activityLabel, activityTone, formatRelativeDays, formatShortDate } from '@/lib/formatDate'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer, CustomerActivitySummary } from '@/types'

type ActivityFilter = 'all' | 'active' | 'inactive' | 'new'
type SortKey = 'last_visit' | 'visits' | 'claimed' | 'joined'

const workspace = useWorkspaceStore()
const customers = ref<Customer[]>([])
const summary = ref<CustomerActivitySummary | null>(null)
const activityFilter = ref<ActivityFilter>('all')
const sortKey = ref<SortKey>('last_visit')
const loading = ref(true)
const error = ref('')

const filterOptions: Array<{ id: ActivityFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active (14d)' },
  { id: 'inactive', label: 'Inactive (30d+)' },
  { id: 'new', label: 'New' },
]

async function loadCustomers() {
  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap()

    const venueId = workspace.effectiveVenueId

    if (!venueId) {
      customers.value = []
      summary.value = null
      return
    }

    const params = new URLSearchParams()
    if (activityFilter.value !== 'all') {
      params.set('activity', activityFilter.value)
    }
    params.set('sort', sortKey.value)

    const query = params.toString()
    const path = `/venues/${venueId}/customers${query ? `?${query}` : ''}`

    const response = await api<{
      customers: Customer[]
      summary: CustomerActivitySummary
    }>(path)

    customers.value = response.customers
    summary.value = response.summary
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load customers.')
  } finally {
    loading.value = false
  }
}

const hasVenue = computed(() => workspace.effectiveVenueId != null)

watch([() => workspace.filterVenueId, activityFilter, sortKey], loadCustomers)

onMounted(loadCustomers)
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <AppBadge tone="blue">Retention</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Customers</h1>
        <p class="mt-2 max-w-2xl text-slate-500">
          See who is active, who has gone quiet, and open a profile for visit history and notes.
        </p>
      </div>
    </div>

    <div v-if="summary && hasVenue" class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
      <AppCard wrapper-class="p-4 text-center">
        <p class="text-2xl font-black text-slate-950">{{ summary.total }}</p>
        <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Total</p>
      </AppCard>
      <AppCard wrapper-class="p-4 text-center">
        <p class="text-2xl font-black text-emerald-700">{{ summary.active }}</p>
        <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Active</p>
      </AppCard>
      <AppCard wrapper-class="p-4 text-center">
        <p class="text-2xl font-black text-amber-700">{{ summary.cooling }}</p>
        <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">At risk</p>
      </AppCard>
      <AppCard wrapper-class="p-4 text-center">
        <p class="text-2xl font-black text-slate-600">{{ summary.inactive }}</p>
        <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Inactive</p>
      </AppCard>
      <AppCard wrapper-class="p-4 text-center col-span-2 sm:col-span-1">
        <p class="text-2xl font-black text-indigo-700">{{ summary.new }}</p>
        <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">New</p>
      </AppCard>
    </div>

    <div v-if="hasVenue" class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in filterOptions"
          :key="option.id"
          type="button"
          class="rounded-full px-3 py-1.5 text-sm font-semibold transition"
          :class="activityFilter === option.id
            ? 'bg-slate-950 text-white shadow-sm'
            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'"
          @click="activityFilter = option.id"
        >
          {{ option.label }}
        </button>
      </div>
      <label class="flex items-center gap-2 text-sm font-semibold text-slate-600">
        Sort
        <select
          v-model="sortKey"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
        >
          <option value="last_visit">Last visit</option>
          <option value="visits">Most visits</option>
          <option value="claimed">Most redeemed</option>
          <option value="joined">Recently joined</option>
        </select>
      </label>
    </div>

    <AppCard wrapper-class="overflow-hidden p-0">
      <div class="divide-y divide-slate-100">
        <div v-if="!hasVenue && !loading" class="p-5">
          <EmptyState
            bare
            :icon="Users"
            title="Select a venue"
            description="Pick a venue in the sidebar filter to view customers."
          />
        </div>
        <div v-else-if="loading" class="p-5">
          <EmptyState bare compact title="Loading customers…" />
        </div>
        <div v-else-if="error" class="p-5">
          <ErrorState bare :message="error" @retry="loadCustomers" />
        </div>
        <div v-else-if="!customers.length" class="p-5">
          <EmptyState
            bare
            :icon="Users"
            title="No customers in this view"
            description="Try another filter or share your venue QR to get first joins."
          />
        </div>
        <RouterLink
          v-for="customer in customers"
          :key="customer.id"
          :to="`/customers/${customer.id}`"
          class="flex flex-col gap-3 p-5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-black text-slate-950">{{ customer.user?.name ?? 'Customer' }}</p>
              <AppBadge :tone="activityTone(customer.activity_status)">
                {{ activityLabel(customer.activity_status) }}
              </AppBadge>
            </div>
            <p class="text-sm text-slate-500">{{ customer.user?.email }}</p>
            <p class="mt-1 text-xs text-slate-400">
              Joined {{ formatShortDate(customer.joined_at) }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Last visit</p>
              <p class="font-semibold text-slate-800">{{ formatRelativeDays(customer.last_visit_at) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Visits</p>
              <p class="font-semibold text-slate-800">{{ customer.visits_count ?? 0 }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Redeemed</p>
              <p class="font-semibold text-slate-800">{{ customer.rewards_claimed_count ?? 0 }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Stamps</p>
              <p class="font-semibold text-amber-700">{{ customer.stamps }}</p>
            </div>
          </div>
        </RouterLink>
      </div>
    </AppCard>
  </AppShell>
</template>
