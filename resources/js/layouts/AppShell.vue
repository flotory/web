<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import VenueFilter from '@/components/loyalty/VenueFilter.vue'
import { staffScannerPath } from '@/lib/venueRoles'
import { useAuthStore } from '@/stores/auth'
import { useCustomerRewardsStore } from '@/stores/customerRewards'
import { useWorkspaceStore } from '@/stores/workspace'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const customerRewards = useCustomerRewardsStore()
const rewardBadgePulsing = ref(false)
let rewardBadgePulseTimer: number | undefined

const isWorkspace = computed(() => {
  if (route.meta.adminOnly === true && auth.isAdmin) {
    return true
  }

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

const homePath = computed(() => {
  if (!isWorkspace.value) {
    return '/wallet'
  }

  if (workspace.usesStaffNav) {
    return staffScannerPath(workspace.effectiveVenueId)
  }

  return '/dashboard'
})

const nav = computed(() => {
  if (!isWorkspace.value) {
    return [
      { label: 'Wallet', to: '/wallet', icon: '◍' },
      { label: 'Rewards', to: '/customer/rewards', icon: '★', badge: customerRewards.pendingCount },
      { label: 'Venues', to: '/venues', icon: '⌂' },
      { label: 'Settings', to: '/customer/settings', icon: '⚙' },
    ]
  }

  if (workspace.usesStaffNav) {
    return [
      { label: 'Scanner', to: staffScannerPath(workspace.effectiveVenueId), routeName: 'scanner', icon: '◎' },
      { label: 'Customers', to: '/customers', icon: '◍' },
      { label: 'Account', to: '/account', icon: '⚙' },
    ]
  }

  const items = [
    { label: 'Dashboard', to: '/dashboard', icon: '◈' },
    { label: 'Scanner', to: staffScannerPath(workspace.effectiveVenueId), routeName: 'scanner', icon: '◎' },
    { label: 'My Venues', to: '/my-venues', icon: '⌂' },
    { label: 'Customers', to: '/customers', icon: '◍' },
    { label: 'Rewards', to: '/rewards', icon: '★' },
    { label: 'Analytics', to: '/analytics', icon: '◔' },
    { label: 'Team', to: '/team', icon: '◧' },
    { label: 'Workspace', to: '/settings', icon: '⚙' },
  ]

  if (auth.isAdmin) {
    items.splice(1, 0, { label: 'Activity log', to: '/admin/activity', icon: '◫' })
  }

  return items
})

const isNavActive = (item: { to: string; routeName?: string }) =>
  route.path === item.to || (item.routeName ? route.name === item.routeName : false)

const isFlushPage = computed(() => route.meta.flush === true)

watch(
  () => customerRewards.badgePulseToken,
  (token) => {
    if (token === 0) {
      return
    }

    rewardBadgePulsing.value = false
    window.requestAnimationFrame(() => {
      rewardBadgePulsing.value = true
    })
    window.clearTimeout(rewardBadgePulseTimer)
    rewardBadgePulseTimer = window.setTimeout(() => {
      rewardBadgePulsing.value = false
    }, 1500)
  },
)

watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      workspace.bootstrap().catch(() => undefined)
      if (!auth.isAdmin) {
        customerRewards.refresh().catch(() => undefined)
      }
    } else {
      workspace.$reset()
      customerRewards.clear()
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
    <aside v-if="isWorkspace" class="sticky top-0 hidden h-screen border-r border-slate-200/80 bg-white/95 p-4 backdrop-blur md:block">
      <RouterLink :to="homePath" class="block px-3 py-3">
        <FlotoryLogo size="lg" />
      </RouterLink>
      <div v-if="!workspace.usesStaffNav || workspace.activeVenues.length > 1" class="mt-4 px-2">
        <VenueFilter />
      </div>
      <div v-if="auth.isAdmin" class="mx-2 mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
        <p class="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Super admin</p>
        <RouterLink
          to="/admin/activity"
          class="mt-2 flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <span aria-hidden="true">◫</span>
          Activity log
        </RouterLink>
      </div>
      <nav class="mt-6 space-y-1">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition',
            isNavActive(item)
              ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 hover:shadow-sm',
          ]"
        >
          <span class="grid size-6 place-items-center rounded-lg bg-slate-100 text-sm font-black text-slate-500" :class="isNavActive(item) && 'bg-white/20 text-white'">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <button class="mt-6 w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" @click="logout">
        Logout
      </button>
    </aside>

    <div>
      <header v-if="isWorkspace" class="sticky top-0 z-20 border-b border-white/60 bg-slate-100/85 backdrop-blur-xl md:hidden">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <RouterLink :to="homePath">
            <FlotoryLogo />
          </RouterLink>
          <button class="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200" @click="logout">
            Logout
          </button>
        </div>
        <div v-if="workspace.activeVenues.length > 1" class="mx-auto max-w-6xl px-4 pb-3">
          <VenueFilter />
        </div>
      </header>

      <main
        :class="[
          'mx-auto max-w-6xl',
          isFlushPage
            ? 'px-0 pt-0 pb-28'
            : isWorkspace
              ? 'px-4 py-6 pb-36 md:py-10 md:pb-10'
              : 'px-4 py-4 pb-28',
        ]"
      >
        <slot />
      </main>

      <nav
        :class="[
          'fixed inset-x-4 bottom-4 z-20 flex gap-2 overflow-x-auto rounded-[1.6rem] bg-slate-950 p-2 text-white shadow-2xl',
          isWorkspace ? 'md:hidden' : 'max-w-md mx-auto',
        ]"
      >
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="[
            'relative min-w-20 flex-1 rounded-2xl px-3 py-3 text-center text-xs font-bold transition',
            isNavActive(item) ? 'bg-white text-slate-950' : 'text-white/65',
          ]"
        >
          {{ item.label }}
          <span
            v-if="'badge' in item && item.badge"
            :class="[
              'absolute -right-0.5 -top-0.5 grid min-w-[1.125rem] place-items-center rounded-full bg-amber-400 px-1 py-px text-[10px] font-black leading-none text-slate-950 ring-2 ring-slate-950',
              item.to === '/customer/rewards' && rewardBadgePulsing ? 'reward-badge-pop' : '',
            ]"
          >
            {{ item.badge }}
          </span>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<style scoped>
@keyframes reward-badge-pop {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }

  12% {
    transform: scale(1.45) translateY(-7px);
  }

  24% {
    transform: scale(1) translateY(0);
  }

  36% {
    transform: scale(1.35) translateY(-5px);
  }

  48% {
    transform: scale(1) translateY(0);
  }

  60% {
    transform: scale(1.25) translateY(-4px);
  }

  72% {
    transform: scale(1) translateY(0);
  }

  84% {
    transform: scale(1.15) translateY(-2px);
  }
}

.reward-badge-pop {
  animation: reward-badge-pop 1.4s ease-out;
}
</style>
