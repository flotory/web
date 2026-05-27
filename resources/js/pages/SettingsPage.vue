<script setup lang="ts">
import { onMounted, ref } from 'vue'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api } from '@/lib/api'
import type { Venue } from '@/types'

const venue = ref<Venue | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    venue.value = (await api<{ venue: Venue | null }>('/venues/current')).venue
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="blue">Workspace settings</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Settings</h1>
      <p class="mt-2 text-slate-500">Keep branch-level controls separate from the customer loyalty experience.</p>
    </div>

    <AppCard>
      <p class="text-sm font-bold text-slate-500">
        {{ loading ? 'Loading workspace...' : `Active venue: ${venue?.name ?? 'No venue selected'}` }}
      </p>
      <h2 class="mt-3 text-2xl font-black text-slate-950">Simple settings will live here</h2>
      <p class="mt-2 max-w-2xl text-slate-500">
        The first settings pass should focus on venue profile details, loyalty defaults, and scanner behavior without turning the product into a heavy admin panel.
      </p>
    </AppCard>
  </AppShell>
</template>
