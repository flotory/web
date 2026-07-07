<script setup lang="ts">
import { ArrowLeft, MapPinOff } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { bootstrapWorkspaceOrSignOut } from '@/lib/sessionGuard'
import { marketingCardClass } from '@/lib/marketingPage'
import { resolveAuthenticatedHomePath } from '@/lib/venueRoles'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const homePath = ref('/')

const homeLabel = computed(() => {
  if (!auth.isAuthenticated) {
    return 'Back to home'
  }

  if (auth.isAdmin) {
    return 'Go to admin'
  }

  return 'Go to dashboard'
})

onMounted(async () => {
  if (!auth.booted && auth.token) {
    await auth.fetchUser()
  }

  if (!auth.isAuthenticated) {
    return
  }

  if (await bootstrapWorkspaceOrSignOut(auth, workspace)) {
    homePath.value = resolveAuthenticatedHomePath(
      auth.user?.is_admin,
      workspace.activeVenues,
      workspace.effectiveVenueId,
      auth.mayCreateVenue,
    )
  }
})
</script>

<template>
  <MarketingPageShell width="md-wide" padding-y="10">
    <AppCard :wrapper-class="`${marketingCardClass} text-center`">
      <div class="mx-auto grid size-16 place-items-center rounded-2xl bg-surface-muted text-ink-muted">
        <MapPinOff class="size-8" :stroke-width="1.75" aria-hidden="true" />
      </div>

      <AppBadge tone="slate" class="mt-6">404</AppBadge>
      <h1 class="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">Page not found</h1>
      <p class="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
        This link may be broken, or the page may have moved. Check the URL or head back to Flotory.
      </p>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <RouterLink :to="homePath">
          <AppButton>
            <ArrowLeft class="size-4" />
            {{ homeLabel }}
          </AppButton>
        </RouterLink>
        <RouterLink v-if="!auth.isAuthenticated" to="/contact">
          <AppButton variant="secondary">Contact us</AppButton>
        </RouterLink>
      </div>
    </AppCard>
  </MarketingPageShell>
</template>
