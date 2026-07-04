<script setup lang="ts">
import { RouterLink } from 'vue-router'

import CalendlyEmbed from '@/components/marketing/CalendlyEmbed.vue'
import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { marketingCardClass } from '@/lib/marketingPage'
</script>

<template>
  <MarketingPageShell width="3xl" padding-y="10">
    <AppCard :wrapper-class="`${marketingCardClass} sm:p-6`">
      <div class="flex flex-wrap items-center gap-3">
        <AppBadge tone="amber">Owner demo</AppBadge>
        <h1 class="text-2xl font-black tracking-tight text-ink sm:text-3xl">Book a 30-minute walkthrough</h1>
      </div>
      <p class="mt-2 text-sm leading-relaxed text-ink-muted">
        Pick a time below — no Flotory account needed. Every venue is personally onboarded by the Flotory team; most launches go live within <strong class="font-semibold text-ink">1–3 business days</strong>.
      </p>
      <p class="mt-3 text-sm text-ink-muted">
        Questions before booking?
        <RouterLink to="/contact" class="font-semibold text-ink hover:underline">Contact us</RouterLink>
      </p>

      <div class="mt-4">
        <CalendlyEmbed utm-campaign="book-demo" />
      </div>
    </AppCard>
  </MarketingPageShell>
</template>
