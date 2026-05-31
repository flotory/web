<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api } from '@/lib/api'
import { venueLogoUrl } from '@/lib/venueMedia'
import type { Customer } from '@/types'

const loading = ref(true)
const error = ref('')
const cards = ref<Customer[]>([])

async function loadCards() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<{ cards: Customer[] }>('/customer/cards')
    cards.value = response.cards
  } catch {
    error.value = 'Could not load your venues. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(loadCards)
</script>

<template>
  <AppShell>
    <div class="mx-auto w-full max-w-md">
      <h1 class="text-2xl font-black tracking-tight text-slate-950">Your venues</h1>
      <p class="mt-1 text-sm text-slate-500">Open a loyalty card for any venue you have joined.</p>

      <div v-if="loading" class="mt-6">
        <AppCard>
          <p class="text-center text-sm font-semibold text-slate-500">Loading venues...</p>
        </AppCard>
      </div>

      <div v-else-if="error" class="mt-6">
        <AppCard>
          <p class="text-center text-sm font-semibold text-red-600">{{ error }}</p>
        </AppCard>
      </div>

      <div v-else-if="!cards.length" class="mt-6">
        <AppCard>
          <p class="text-center text-sm text-slate-500">
            You have not joined any venues yet. Scan a venue QR or open their join link to get started.
          </p>
        </AppCard>
      </div>

      <ul v-else class="mt-6 space-y-3">
        <li v-for="card in cards" :key="card.id">
          <RouterLink
            :to="{ name: 'customer-card', query: { venue_id: String(card.venue_id) } }"
            class="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div
              v-if="card.venue"
              class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200/80"
            >
              <img
                :src="venueLogoUrl(card.venue)"
                :alt="card.venue.name"
                class="size-full rounded-[14px] object-cover"
              >
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-black text-slate-950">{{ card.venue?.name ?? 'Venue' }}</p>
              <p class="mt-0.5 text-sm text-slate-500">{{ card.stamps }} {{ card.stamps === 1 ? 'stamp' : 'stamps' }}</p>
            </div>
            <AppBadge tone="amber">Open card</AppBadge>
          </RouterLink>
        </li>
      </ul>
    </div>
  </AppShell>
</template>
