<script setup lang="ts">
import { Activity } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { formatShortDate } from '@/lib/formatDate'

type AuditRow = {
  id: number
  description: string
  event: string
  created_at: string
  request_id: string | null
  venue_id: number | null
  customer_id: number | null
  route: string | null
  status: string | null
  properties: Record<string, unknown>
  causer: { id: number; name: string; email: string } | null
  subject_type: string | null
  subject_id: number | null
}

const rows = ref<AuditRow[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)

const q = ref('')
const eventFilter = ref('')
const requestId = ref('')
const venueId = ref('')
const customerId = ref('')

function eventTone(event: string): 'green' | 'amber' | 'slate' | 'blue' {
  if (event === 'success') return 'green'
  if (event === 'failed') return 'amber'
  return 'slate'
}

function formatDescription(description: string): string {
  return description.replaceAll('.', ' · ')
}

async function loadActivity() {
  loading.value = true
  error.value = ''

  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    if (q.value.trim()) params.set('q', q.value.trim())
    if (eventFilter.value) params.set('event', eventFilter.value)
    if (requestId.value.trim()) params.set('request_id', requestId.value.trim())
    if (venueId.value.trim()) params.set('venue_id', venueId.value.trim())
    if (customerId.value.trim()) params.set('customer_id', customerId.value.trim())

    const response = await api<{
      data: AuditRow[]
      meta: { current_page: number; last_page: number; total: number }
    }>(`/admin/activity?${params}`)

    rows.value = response.data
    page.value = response.meta.current_page
    lastPage.value = response.meta.last_page
    total.value = response.meta.total
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load activity log.')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  void loadActivity()
}

onMounted(loadActivity)
watch(page, loadActivity)
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-6xl space-y-6">
      <div>
        <p class="text-xs font-bold uppercase tracking-widest text-slate-500">Admin</p>
        <h1 class="mt-1 text-3xl font-black text-slate-950">Activity log</h1>
        <p class="mt-2 max-w-2xl text-sm text-slate-600">
          Loyalty actions and API validation failures from production. Use the request ID from the network tab when correlating issues.
        </p>
      </div>

      <AppCard class="space-y-4 p-5">
        <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label class="block text-sm font-semibold text-slate-700">
            Search
            <input
              v-model="q"
              type="search"
              placeholder="stamp, redeem, reward…"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              @keyup.enter="applyFilters"
            >
          </label>
          <label class="block text-sm font-semibold text-slate-700">
            Event
            <select v-model="eventFilter" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">All</option>
              <option value="success">success</option>
              <option value="failed">failed</option>
              <option value="info">info</option>
            </select>
          </label>
          <label class="block text-sm font-semibold text-slate-700">
            Request ID
            <input
              v-model="requestId"
              type="text"
              placeholder="UUID from network tab"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              @keyup.enter="applyFilters"
            >
          </label>
          <label class="block text-sm font-semibold text-slate-700">
            Venue ID
            <input
              v-model="venueId"
              type="number"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              @keyup.enter="applyFilters"
            >
          </label>
          <label class="block text-sm font-semibold text-slate-700">
            Customer ID
            <input
              v-model="customerId"
              type="number"
              class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              @keyup.enter="applyFilters"
            >
          </label>
        </div>
        <button
          type="button"
          class="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
          @click="applyFilters"
        >
          Apply filters
        </button>
      </AppCard>

      <ErrorState v-if="error" :message="error" @retry="loadActivity" />

      <AppCard v-else-if="loading" class="p-8 text-center text-sm text-slate-500">
        Loading activity…
      </AppCard>

      <EmptyState
        v-else-if="rows.length === 0"
        :icon="Activity"
        title="No activity yet"
        description="Events appear when stamps, redeems, rewards, or failed API validations occur."
      />

      <template v-else>
        <p class="text-sm text-slate-600">{{ total }} events · page {{ page }} of {{ lastPage }}</p>

        <div class="space-y-3">
          <AppCard
            v-for="row in rows"
            :key="row.id"
            class="p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="font-bold text-slate-950">{{ formatDescription(row.description) }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ formatShortDate(row.created_at) }}</p>
              </div>
              <AppBadge :tone="eventTone(row.event)">{{ row.event }}</AppBadge>
            </div>

            <dl class="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <div v-if="row.causer">
                <dt class="font-semibold text-slate-500">Actor</dt>
                <dd>{{ row.causer.name }} ({{ row.causer.email }})</dd>
              </div>
              <div v-if="row.venue_id">
                <dt class="font-semibold text-slate-500">Venue</dt>
                <dd>#{{ row.venue_id }}</dd>
              </div>
              <div v-if="row.customer_id">
                <dt class="font-semibold text-slate-500">Customer</dt>
                <dd>#{{ row.customer_id }}</dd>
              </div>
              <div v-if="row.request_id">
                <dt class="font-semibold text-slate-500">Request ID</dt>
                <dd class="break-all font-mono">{{ row.request_id }}</dd>
              </div>
              <div v-if="row.route">
                <dt class="font-semibold text-slate-500">Route</dt>
                <dd class="break-all">{{ row.route }}</dd>
              </div>
            </dl>
          </AppCard>
        </div>

        <div v-if="lastPage > 1" class="flex justify-center gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40"
            :disabled="page <= 1"
            @click="page -= 1"
          >
            Previous
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40"
            :disabled="page >= lastPage"
            @click="page += 1"
          >
            Next
          </button>
        </div>
      </template>
    </div>
  </AppShell>
</template>
