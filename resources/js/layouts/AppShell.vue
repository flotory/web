<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import VenueFilter from '@/components/loyalty/VenueFilter.vue'
import { ADMIN_HOME_PATH, staffScannerPath } from '@/lib/venueRoles'
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

  if (auth.isAdmin) {
    return ADMIN_HOME_PATH
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
      { label: 'My QR', to: '/my-qr', icon: '◎' },
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

  if (auth.isAdmin) {
    return [
      { label: 'Venue listings', to: '/admin/venues', icon: '▣' },
      { label: 'Design palette', to: '/admin/palette', icon: '◐' },
      { label: 'Activity log', to: '/admin/activity', icon: '◫' },
    ]
  }

  return [
    { label: 'Dashboard', to: '/dashboard', icon: '◈' },
    { label: 'Scanner', to: staffScannerPath(workspace.effectiveVenueId), routeName: 'scanner', icon: '◎' },
    { label: 'My Venues', to: '/my-venues', icon: '⌂' },
    { label: 'Customers', to: '/customers', icon: '◍' },
    { label: 'Rewards', to: '/rewards', icon: '★' },
    { label: 'Campaigns', to: '/campaigns', icon: '✦' },
    { label: 'Analytics', to: '/analytics', icon: '◔' },
    { label: 'Team', to: '/team', icon: '◧' },
    { label: 'Workspace', to: '/settings', icon: '⚙' },
  ]
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
  <div class="min-h-screen" :class="isWorkspace ? 'md:grid md:grid-cols-[272px_1fr]' : 'bg-bg'">
    <aside
      v-if="isWorkspace"
      class="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar-bg px-4 py-5 md:flex"
    >
      <RouterLink :to="homePath" class="block rounded-2xl px-3 py-2 transition hover:bg-sidebar-hover">
        <FlotoryLogo size="lg" inverted />
      </RouterLink>

      <div
        v-if="workspace.hasMembership && (!workspace.usesStaffNav || workspace.activeVenues.length > 1)"
        class="mt-5 px-1"
      >
        <VenueFilter variant="sidebar" />
      </div>

      <nav class="mt-6 flex-1 space-y-1 overflow-y-auto px-1">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="[
            'group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition',
            isNavActive(item)
              ? 'bg-nav-active-bg text-nav-active-text shadow-[0_8px_24px_rgba(214,177,94,0.28)]'
              : 'text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text',
          ]"
        >
          <span
            :class="[
              'grid size-7 shrink-0 place-items-center rounded-xl text-sm font-black transition',
              isNavActive(item)
                ? 'bg-nav-active-text/10 text-nav-active-text'
                : 'bg-white/5 text-sidebar-text-muted group-hover:bg-white/10 group-hover:text-sidebar-text',
            ]"
          >
            {{ item.icon }}
          </span>
          <span class="truncate">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <button
        class="mt-4 w-full rounded-2xl border border-sidebar-border px-4 py-3 text-left text-sm font-bold text-sidebar-text-muted transition hover:border-accent/40 hover:bg-sidebar-hover hover:text-sidebar-text"
        @click="logout"
      >
        Logout
      </button>
    </aside>

    <div :class="isWorkspace && 'bg-workspace-gradient min-h-screen'">
      <header v-if="isWorkspace" class="sticky top-0 z-20 border-b border-border/60 bg-workspace-bg/80 backdrop-blur-xl md:hidden">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <RouterLink :to="homePath">
            <FlotoryLogo />
          </RouterLink>
          <button class="rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-ink-muted shadow-sm ring-1 ring-border" @click="logout">
            Logout
          </button>
        </div>
        <div
          v-if="workspace.hasMembership && workspace.activeVenues.length > 1"
          class="mx-auto max-w-6xl px-4 pb-3"
        >
          <VenueFilter variant="default" />
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
          'fixed inset-x-4 bottom-4 z-20 flex gap-2 overflow-x-auto rounded-[1.6rem] border border-sidebar-border bg-sidebar-bg p-2 text-sidebar-text shadow-2xl shadow-primary/30',
          isWorkspace ? 'md:hidden' : 'max-w-md mx-auto',
        ]"
      >
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="[
            'relative min-w-20 flex-1 rounded-2xl px-3 py-3 text-center text-xs font-bold transition',
            isNavActive(item) ? 'bg-nav-active-bg text-nav-active-text' : 'text-sidebar-text-muted',
          ]"
        >
          {{ item.label }}
          <span
            v-if="'badge' in item && item.badge"
            :class="[
              'absolute -right-0.5 -top-0.5 grid min-w-[1.125rem] place-items-center rounded-full bg-accent px-1 py-px text-[10px] font-black leading-none text-ink ring-2 ring-primary',
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
