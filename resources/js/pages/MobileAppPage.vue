<script setup lang="ts">
import { RouterLink } from 'vue-router'

import MarketingPageHeader from '@/components/layout/MarketingPageHeader.vue'
import MarketingFooter from '@/components/layout/MarketingFooter.vue'
import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import { marketingCardClass } from '@/lib/marketingPage'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { mobileAppDeepLink } from '@/lib/mobileApp'

const appDeepLink = mobileAppDeepLink()
</script>

<template>
  <MarketingPageShell width="lg" padding-y="10">
      <MarketingPageHeader />

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

        <div class="mt-8 space-y-3 text-center">
          <p class="text-sm font-semibold text-ink-muted">Venue owner?</p>
          <RouterLink to="/book-demo" class="block">
            <AppButton class="w-full" size="lg" variant="secondary">Book A Demo</AppButton>
          </RouterLink>
          <p class="text-sm text-ink-muted">
            Already onboarded?
            <RouterLink to="/login?intent=owner" class="font-bold text-ink">Log in to the dashboard</RouterLink>
          </p>
        </div>
      </AppCard>

      <div class="mt-10">
        <MarketingFooter />
      </div>
  </MarketingPageShell>
</template>
