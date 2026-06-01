<script setup lang="ts">
import { ChevronRight, MapPin, Search, Wallet } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { venueCoverUrl } from '@/lib/venueMedia'
import AppShell from '@/layouts/AppShell.vue'
import type { Customer } from '@/types'

interface CardsResponse {
  cards: Customer[]
  pending_rewards_count: number
}

const router = useRouter()
const loading = ref(true)
const error = ref('')
const cards = ref<Customer[]>([])
const search = ref('')

const filteredCards = computed(() => {
  const query = search.value.trim().toLowerCase()
  const list = cards.value.filter((card) => card.venue)

  const sorted = [...list].sort((a, b) => {
    const pendingA = a.summary?.pending_rewards_count ?? 0
    const pendingB = b.summary?.pending_rewards_count ?? 0
    if (pendingA !== pendingB) {
      return pendingB - pendingA
    }

    return (a.venue?.name ?? '').localeCompare(b.venue?.name ?? '')
  })

  if (!query) {
    return sorted
  }

  return sorted.filter((card) => {
    const venue = card.venue!
    const haystack = [venue.name, venue.address, venue.slug].filter(Boolean).join(' ').toLowerCase()

    return haystack.includes(query)
  })
})

function progressPercent(card: Customer): number {
  const stamps = card.summary?.stamps ?? card.stamps
  const max = card.summary?.max_stamps ?? 10

  return Math.min(100, Math.round((stamps / max) * 100))
}

function openCard(card: Customer) {
  router.push({ name: 'customer-wallet', query: { venue_id: String(card.venue_id) } })
}

async function loadCards() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<CardsResponse>('/customer/cards')
    cards.value = response.cards
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load your wallet. Please try again.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCards()
})
</script>

<template>
  <AppShell>
    <div class="mx-auto w-full max-w-md px-4 pb-8 pt-4">
      <header class="mb-5">
        <h1 class="text-2xl font-black tracking-tight text-slate-950">Wallet</h1>
        <p class="mt-1 text-sm text-slate-500">Your loyalty cards at every venue you have joined.</p>
      </header>

      <div v-if="loading" class="py-8">
        <EmptyState compact title="Loading your wallet…" />
      </div>

      <div v-else-if="error" class="py-8">
        <ErrorState :message="error" @retry="loadCards()" />
      </div>

      <div v-else-if="!cards.length" class="py-8">
        <EmptyState
          :icon="Wallet"
          title="No cards yet"
          description="Join a venue to collect stamps and unlock rewards."
        >
          <RouterLink to="/venues">
            <AppButton>Browse venues</AppButton>
          </RouterLink>
        </EmptyState>
      </div>

      <template v-else>
        <label class="relative mb-4 block">
          <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Search venues"
            class="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500/30 placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2"
          >
        </label>

        <p v-if="!filteredCards.length" class="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm text-slate-500">
          No venues match your search.
        </p>

        <ul v-else class="space-y-3">
          <li v-for="card in filteredCards" :key="card.id">
            <button
              type="button"
              class="group w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-left shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] transition hover:border-indigo-200 hover:shadow-[0_20px_48px_-24px_rgba(79,70,229,0.22)]"
              @click="openCard(card)"
            >
              <div class="relative h-28 w-full overflow-hidden">
                <img
                  v-if="card.venue"
                  :src="venueCoverUrl(card.venue)"
                  :alt="card.venue.name"
                  class="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
                >
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent" />
                <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-base font-bold text-white">{{ card.venue?.name }}</p>
                    <p
                      v-if="card.venue?.address"
                      class="mt-0.5 flex items-center gap-1 truncate text-xs text-white/85"
                    >
                      <MapPin class="size-3 shrink-0" />
                      {{ card.venue.address }}
                    </p>
                  </div>
                  <AppBadge v-if="(card.summary?.pending_rewards_count ?? 0) > 0" tone="green">
                    {{ card.summary?.pending_rewards_count }} ready
                  </AppBadge>
                </div>
              </div>

              <div class="space-y-2 px-4 py-3.5">
                <div class="flex items-center justify-between gap-3 text-sm">
                  <span class="font-semibold text-slate-800">
                    {{ card.summary?.stamps ?? card.stamps }} / {{ card.summary?.max_stamps ?? 10 }} stamps
                  </span>
                  <ChevronRight class="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="h-full rounded-full bg-indigo-500 transition-all"
                    :style="{ width: `${progressPercent(card)}%` }"
                  />
                </div>
                <p v-if="card.summary?.next_reward_title" class="truncate text-xs text-slate-500">
                  <template v-if="(card.summary?.stamps_to_next ?? 0) > 0">
                    {{ card.summary?.stamps_to_next }} more for {{ card.summary?.next_reward_title }}
                  </template>
                  <template v-else>
                    {{ card.summary?.next_reward_title }} unlocked
                  </template>
                </p>
              </div>
            </button>
          </li>
        </ul>
      </template>
    </div>
  </AppShell>
</template>
