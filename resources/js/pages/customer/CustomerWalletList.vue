<script setup lang="ts">
import { Plus, Search } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import CustomerScreen from '@/components/customer/CustomerScreen.vue'
import WalletHeroCard from '@/components/customer/WalletHeroCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { api, apiErrorMessage } from '@/lib/api'
import AppShell from '@/layouts/AppShell.vue'
import type { Customer } from '@/types'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const cards = ref<Customer[]>([])
const search = ref('')

const filteredCards = computed(() => {
  const query = search.value.trim().toLowerCase()
  const list = cards.value.filter((card) => card.venue)

  if (!query) {
    return list
  }

  return list.filter((card) => (card.venue?.name ?? '').toLowerCase().includes(query))
})

async function loadCards() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<{ cards: Customer[] }>('/customer/cards')
    cards.value = response.cards
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load your wallet. Please try again.')
  } finally {
    loading.value = false
  }
}

onMounted(loadCards)
</script>

<template>
  <AppShell>
    <CustomerScreen>
      <div class="mx-auto w-full max-w-md pb-4">
        <div class="flex items-center justify-between">
          <h1 class="text-[34px] font-extrabold tracking-tight text-ink">Wallet</h1>
          <button
            type="button"
            class="grid size-10 place-items-center rounded-full bg-ink text-primary-text shadow-sm transition hover:bg-primary-soft"
            aria-label="Discover venues"
            @click="router.push('/venues')"
          >
            <Plus class="size-5" />
          </button>
        </div>

        <label
          v-if="cards.length > 0"
          class="relative mt-3.5 block"
        >
          <Search class="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-soft" />
          <input
            v-model="search"
            type="search"
            placeholder="Search venues"
            class="w-full rounded-2xl border border-border bg-surface py-3 pl-10 pr-4 text-[15px] text-ink outline-none placeholder:text-ink-soft focus:border-accent-border"
          >
        </label>

        <div v-if="loading" class="mt-10">
          <EmptyState compact title="Loading your wallet…" />
        </div>

        <ErrorState
          v-else-if="error"
          class="mt-10"
          :message="error"
          @retry="loadCards"
        />

        <div
          v-else-if="!cards.length"
          class="mt-16 rounded-[22px] border border-border bg-surface p-6 text-center shadow-sm"
        >
          <p class="text-3xl">💳</p>
          <p class="mt-3 text-lg font-extrabold text-ink">No cards yet</p>
          <p class="mt-2 text-sm text-ink-muted">
            Discover venues nearby and start collecting visits toward your first reward.
          </p>
          <AppButton
            class="mt-4"
            @click="router.push('/venues')"
          >
            Browse venues
          </AppButton>
        </div>

        <div
          v-else-if="!filteredCards.length"
          class="mt-10 rounded-[22px] border border-border bg-surface p-6 text-center shadow-sm"
        >
          <p class="text-3xl">🔍</p>
          <p class="mt-3 font-extrabold text-ink">No matches</p>
          <p class="mt-2 text-sm text-ink-muted">Try a different venue name.</p>
          <AppButton
            class="mt-4"
            variant="secondary"
            @click="search = ''"
          >
            Clear search
          </AppButton>
        </div>

        <div
          v-else
          class="mt-5 space-y-4"
        >
          <WalletHeroCard
            v-for="card in filteredCards"
            :key="card.id"
            :item="card"
          />
        </div>
      </div>
    </CustomerScreen>
  </AppShell>
</template>
