<script setup lang="ts">
import { RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { mobileAppDeepLink } from '@/lib/mobileApp'

const appDeepLink = mobileAppDeepLink()
</script>

<template>
  <main class="min-h-screen bg-auth-gradient px-4 py-10 text-primary-text">
    <section class="mx-auto w-full max-w-lg">
      <RouterLink to="/" class="mb-6 inline-flex">
        <FlotoryLogo inverted size="lg" />
      </RouterLink>

      <AppCard wrapper-class="rounded-3xl border border-border/20 bg-surface/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-8">
        <h1 class="text-3xl font-black tracking-tight text-ink">Use the Flotory app</h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-muted">
          Customer wallets, My QR, rewards, and the staff scanner live in the Flotory mobile app.
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
    </section>
  </main>
</template>
