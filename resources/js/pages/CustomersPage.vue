<script setup lang="ts">
import { Users } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer } from '@/types'

const workspace = useWorkspaceStore()
const customers = ref<Array<Customer & { visits_count?: number }>>([])
const loading = ref(true)
const error = ref('')

async function loadCustomers() {
  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap()

    const venueId = workspace.effectiveVenueId

    if (!venueId) {
      customers.value = []
      return
    }

    customers.value = (
      await api<{ customers: Array<Customer & { visits_count?: number }> }>(`/venues/${venueId}/customers`)
    ).customers
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load customers.')
  } finally {
    loading.value = false
  }
}

watch(() => workspace.filterVenueId, loadCustomers)

onMounted(loadCustomers)
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="blue">Basic CRM</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Customers</h1>
      <p class="mt-2 text-slate-500">A lightweight customer list focused on stamp progress.</p>
    </div>

    <AppCard wrapper-class="overflow-hidden p-0">
      <div class="divide-y divide-slate-100">
        <div v-if="loading" class="p-5">
          <EmptyState bare compact title="Loading customers…" />
        </div>
        <div v-else-if="error" class="p-5">
          <ErrorState bare :message="error" @retry="loadCustomers" />
        </div>
        <div v-else-if="!customers.length" class="p-5">
          <EmptyState
            bare
            :icon="Users"
            title="No customers yet"
            description="Guests appear here after their first stamp scan. Share your venue QR to get started."
          />
        </div>
        <div v-for="customer in customers" :key="customer.id" class="flex items-center justify-between gap-4 p-5">
          <div>
            <p class="font-black text-slate-950">{{ customer.user?.name ?? 'Customer' }}</p>
            <p class="text-sm text-slate-500">{{ customer.user?.email }}</p>
            <p v-if="customer.venue?.name" class="mt-1 text-xs font-bold text-slate-400">{{ customer.venue.name }}</p>
          </div>
          <div class="text-right">
            <AppBadge tone="amber">{{ customer.stamps }} stamps</AppBadge>
            <p class="mt-2 text-xs font-semibold text-slate-400">{{ customer.visits_count ?? 0 }} visits</p>
          </div>
        </div>
      </div>
    </AppCard>
  </AppShell>
</template>
