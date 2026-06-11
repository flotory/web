<script setup lang="ts">
import { RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import { MARKETING_HOME_PATH } from '@/lib/brand'
import { marketingCardClass } from '@/lib/marketingPage'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { mobileAppDeepLink } from '@/lib/mobileApp'

const appDeepLink = mobileAppDeepLink()
</script>

<template>
  <MarketingPageShell width="lg" padding-y="10">
      <RouterLink :to="MARKETING_HOME_PATH" class="mb-6 inline-flex" aria-label="Flotory home">
        <FlotoryLogo size="lg" />
      </RouterLink>

      <AppCard :wrapper-class="`${marketingCardClass} sm:p-8`">
        <h1 class="text-3xl font-black tracking-tight text-ink">Use the Flotory app</h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-muted">
          Customer wallets, NFC stamps, and slide-to-redeem rewards live in the Flotory mobile app.
          Venue owners manage loyalty from this website.
        </p>

        <div class="mt-6 space-y-3">
          <a :href="appDeepLink" class="block">
            <AppButton class="w-full" size="lg">Open Flotory app</AppButton>
          </a>
          <p class="text-center text-xs font-semibold leading-relaxed text-ink-muted">
            Don&apos;t have the app yet? Install Flotory from the App Store or Google Play, then return here or scan your venue QR again.
          </p>
        </div>

        <p class="mt-8 text-center text-sm text-ink-muted">
          Venue owner?
          <RouterLink to="/login?intent=owner" class="font-bold text-ink">Sign in to the dashboard</RouterLink>
        </p>
      </AppCard>
  </MarketingPageShell>
</template>
