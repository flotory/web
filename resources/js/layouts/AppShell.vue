<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import VenueFilter from '@/components/loyalty/VenueFilter.vue'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()

const isWorkspace = computed(() => {
  if (route.meta.workspace === false) {
    return false
  }

  if (route.meta.workspace === true) {
    return true
  }

  if (route.meta.workspace === 'auto') {
    return workspace.hasMembership
  }

  return false
})

const homePath = computed(() => (isWorkspace.value ? '/dashboard' : '/card'))

const nav = computed(() =>
  isWorkspace.value
    ? [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'My Venues', to: '/my-venues' },
        { label: 'Customers', to: '/customers' },
        { label: 'Rewards', to: '/rewards' },
        { label: 'Analytics', to: '/analytics' },
        { label: 'Team', to: '/team' },
        { label: 'Settings', to: '/settings' },
      ]
    : [
        { label: 'Card', to: '/card' },
        { label: 'Cafes', to: '/cafes' },
        { label: 'Rewards', to: '/rewards' },
      ],
)

watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      workspace.bootstrap().catch(() => undefined)
    } else {
      workspace.$reset()
    }
  },
  { immediate: true },
)

async function logout() {
  await auth.logout()
  workspace.$reset()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100" :class="isWorkspace && 'md:grid md:grid-cols-[260px_1fr]'">
    <aside v-if="isWorkspace" class="sticky top-0 hidden h-screen border-r border-slate-200 bg-white p-4 md:block">
      <RouterLink :to="homePath" class="block px-3 py-3 text-xl font-black tracking-tight text-slate-950">Loyalty</RouterLink>
      <div class="mt-4 px-2">
        <VenueFilter />
      </div>
      <nav class="mt-6 space-y-1">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="[
            'block rounded-2xl px-4 py-3 text-sm font-bold transition',
            route.path === item.to ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950',
          ]"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <button class="mt-6 w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" @click="logout">
        Logout
      </button>
    </aside>

    <div>
    <header class="sticky top-0 z-20 border-b border-white/60 bg-slate-100/85 backdrop-blur-xl" :class="isWorkspace && 'md:hidden'">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <RouterLink :to="homePath" class="text-lg font-black tracking-tight text-slate-950">Loyalty</RouterLink>
        <button class="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 md:hidden" @click="logout">
          Logout
        </button>
        <nav class="hidden gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200 md:flex">
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            :class="[
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              route.path === item.to ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-950',
            ]"
          >
            {{ item.label }}
          </RouterLink>
          <button class="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950" @click="logout">
            Logout
          </button>
        </nav>
      </div>
      <div v-if="isWorkspace && workspace.activeVenues.length > 1" class="mx-auto max-w-6xl px-4 pb-3 md:hidden">
        <VenueFilter />
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 pb-36 md:py-10 md:pb-10">
      <slot />
    </main>

    <nav class="fixed inset-x-4 bottom-4 z-20 flex gap-2 overflow-x-auto rounded-[1.6rem] bg-slate-950 p-2 text-white shadow-2xl md:hidden">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        :class="[
          'min-w-20 flex-1 rounded-2xl px-3 py-3 text-center text-xs font-bold transition',
          route.path === item.to ? 'bg-white text-slate-950' : 'text-white/65',
        ]"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
    </div>
  </div>
</template>
