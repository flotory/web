<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import VenueFilter from '@/components/loyalty/VenueFilter.vue'
import { ADMIN_HOME_PATH } from '@/lib/venueRoles'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const { t } = useI18n()

const isWorkspace = computed(() => {
  if (route.meta.adminOnly === true && auth.isAdmin) {
    return true
  }

  if (route.meta.workspace === true) {
    return true
  }

  if (route.meta.workspace === 'auto') {
    return workspace.hasMembership
  }

  return false
})

const logoPath = computed(() => (auth.isAdmin ? ADMIN_HOME_PATH : '/dashboard'))

const nav = computed(() => {
  if (!isWorkspace.value) {
    return []
  }

  if (auth.isAdmin) {
    return [
      { label: t('nav.venueListings'), to: '/admin/venues', icon: '▣' },
      { label: t('nav.ownerOnboarding'), to: '/admin/owner-onboarding', icon: '✉' },
      { label: t('nav.manageVenues'), to: '/admin/manage-venues', icon: '⌂' },
      { label: t('nav.designPalette'), to: '/admin/palette', icon: '◐' },
      { label: t('nav.activityLog'), to: '/admin/activity', icon: '◫' },
    ]
  }

  return [
    { label: t('nav.dashboard'), to: '/dashboard', icon: '◈' },
    { label: t('nav.myVenues'), to: '/my-venues', icon: '⌂' },
    { label: t('nav.customers'), to: '/customers', icon: '◍' },
    { label: t('nav.rewards'), to: '/rewards', icon: '★' },
    { label: t('nav.campaigns'), to: '/campaigns', icon: '✦' },
    { label: t('nav.analytics'), to: '/analytics', icon: '◔' },
    { label: t('nav.workspace'), to: '/settings', icon: '⚙' },
  ]
})

const isNavActive = (item: { to: string; routeName?: string }) =>
  route.path === item.to || (item.routeName ? route.name === item.routeName : false)

async function logout() {
  await auth.logout()
  workspace.$reset()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-screen md:grid md:grid-cols-[272px_1fr]">
    <aside
      class="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar-bg px-4 py-5 md:flex"
    >
      <RouterLink :to="logoPath" class="block rounded-2xl px-3 py-2 transition hover:bg-sidebar-hover" :aria-label="t('common.dashboard')">
        <FlotoryLogo size="lg" inverted />
      </RouterLink>

      <div
        v-if="workspace.hasMembership && workspace.activeVenues.length > 1"
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
        {{ t('common.logout') }}
      </button>
    </aside>

    <div class="bg-workspace-gradient min-h-screen">
      <header class="sticky top-0 z-20 border-b border-border/60 bg-workspace-bg/80 backdrop-blur-xl md:hidden">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <RouterLink :to="logoPath" :aria-label="t('common.dashboard')">
            <FlotoryLogo />
          </RouterLink>
          <button class="rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-ink-muted shadow-sm border border-border" @click="logout">
            {{ t('common.logout') }}
          </button>
        </div>
        <div
          v-if="workspace.hasMembership && workspace.activeVenues.length > 1"
          class="mx-auto max-w-6xl px-4 pb-3"
        >
          <VenueFilter variant="default" />
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-4 py-6 pb-36 md:py-10 md:pb-10">
        <slot />
      </main>

      <nav
        class="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-md gap-2 overflow-x-auto rounded-[1.6rem] border border-sidebar-border bg-sidebar-bg p-2 text-sidebar-text shadow-2xl shadow-primary/30 md:hidden"
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
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
