<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import CustomerScreen from '@/components/customer/CustomerScreen.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer } from '@/types'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const router = useRouter()
const cards = ref<Customer[]>([])
const loading = ref(true)

const stats = computed(() => {
  const venues = cards.value.length
  const stamps = cards.value.reduce((sum, card) => sum + (card.summary?.stamps ?? card.stamps), 0)
  const rewards = cards.value.reduce((sum, card) => sum + (card.summary?.pending_rewards_count ?? 0), 0)
  return { venues, stamps, rewards }
})

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)

const accountLinks = [
  { label: 'Discover venues', to: '/venues' },
  { label: 'Notifications', to: '/customer/notifications' },
  { label: 'Help', to: null },
  { label: 'Privacy', to: null },
  { label: 'About', to: null },
]

onMounted(async () => {
  try {
    const response = await api<{ cards: Customer[] }>('/customer/cards')
    cards.value = response.cards
  } catch {
    cards.value = []
  } finally {
    loading.value = false
  }
})

async function logout() {
  await auth.logout()
  workspace.$reset()
  await router.push('/login')
}
</script>

<template>
  <AppShell>
    <CustomerScreen>
      <div class="mx-auto w-full max-w-md pb-4">
        <h1 class="text-3xl font-black tracking-tight text-ink">Profile</h1>

        <div class="mt-7 flex flex-col items-center text-center">
          <div class="grid size-[84px] place-items-center rounded-full bg-primary text-3xl font-extrabold text-primary-text">
            {{ initials }}
          </div>
          <p class="mt-3.5 text-xl font-bold text-ink">{{ auth.user?.name ?? 'Guest' }}</p>
          <p class="mt-1 text-sm text-ink-muted">{{ auth.user?.email }}</p>
        </div>

        <div class="mt-7 grid grid-cols-3 gap-2.5">
          <div
            v-for="item in [
              { label: 'Venues', value: stats.venues, accent: false },
              { label: 'Stamps', value: stats.stamps, accent: false },
              { label: 'Ready', value: stats.rewards, accent: true },
            ]"
            :key="item.label"
            class="rounded-[22px] border border-border bg-surface py-3.5 text-center shadow-sm"
          >
            <p
              class="text-xl font-extrabold"
              :class="item.accent ? 'text-accent-active' : 'text-ink'"
            >
              {{ loading ? '—' : item.value }}
            </p>
            <p class="mt-1 text-xs font-semibold text-ink-muted">{{ item.label }}</p>
          </div>
        </div>

        <AppButton
          class="mt-7 w-full"
          size="lg"
          @click="router.push('/my-qr')"
        >
          Show My QR
        </AppButton>

        <AppButton
          class="mt-2.5 w-full"
          size="lg"
          variant="secondary"
          @click="router.push('/venues')"
        >
          Discover venues
        </AppButton>

        <ul class="mt-7 divide-y divide-border rounded-[22px] border border-border bg-surface px-4 shadow-sm">
          <li
            v-for="link in accountLinks"
            :key="link.label"
          >
            <button
              v-if="!link.to"
              type="button"
              class="w-full py-3 text-left text-base font-medium text-ink-muted"
              disabled
            >
              {{ link.label }}
            </button>
            <button
              v-else
              type="button"
              class="w-full py-3 text-left text-base font-medium text-ink transition hover:text-primary-soft"
              @click="router.push(link.to)"
            >
              {{ link.label }}
            </button>
          </li>
        </ul>

        <AppButton
          class="mt-7 w-full"
          variant="secondary"
          @click="logout"
        >
          Sign out
        </AppButton>
      </div>
    </CustomerScreen>
  </AppShell>
</template>
