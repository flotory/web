<script setup lang="ts">
import { Check } from '@lucide/vue'
import { RouterLink } from 'vue-router'

import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { marketingCardClass } from '@/lib/marketingPage'
import {
  accountFreeTrialLabel,
  formatVenueAdditionalMonthlyPrice,
  formatVenueFirstMonthlyPrice,
  pricingIncludedFeatures,
} from '@/lib/pricing'
</script>

<template>
  <MarketingPageShell width="6xl" padding-y="10">
    <AppCard :wrapper-class="`${marketingCardClass} sm:p-8`">
      <div class="flex flex-wrap items-center gap-3">
        <AppBadge tone="amber">Pricing</AppBadge>
        <h1 class="text-2xl font-black tracking-tight text-ink sm:text-3xl">Simple pricing for every venue</h1>
      </div>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">
        One product, one loop — guest app, NFC stands, and owner dashboard. No tiers and no hidden fees.
      </p>

      <div
        class="mt-8 rounded-3xl border-2 border-accent-border/60 bg-gradient-to-br from-accent-soft/90 via-accent-soft/55 to-surface p-6 text-center sm:p-10"
        data-testid="pricing-trial-hero"
      >
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-accent-active sm:text-sm">
          Launch offer
        </p>
        <p
          class="mt-3 text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl"
          data-testid="pricing-trial-headline"
        >
          {{ accountFreeTrialLabel() }}
        </p>
        <p class="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
          Your first month on Flotory is free — one trial per owner account. Try the full loop: onboarding, NFC stands, dashboard, and campaigns before you pay.
        </p>
        <p
          class="mt-4 inline-flex rounded-full border border-accent-border/50 bg-surface px-4 py-2 text-sm font-bold text-ink"
          data-testid="pricing-trial-badge"
        >
          {{ accountFreeTrialLabel() }}
        </p>
      </div>

      <div class="mt-8 grid gap-4 lg:grid-cols-2" data-testid="pricing-plan-card">
        <div class="rounded-3xl border border-accent-border/40 bg-surface p-6 sm:p-8">
          <p class="text-sm font-bold uppercase tracking-wide text-accent-active">First venue</p>
          <div class="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p class="text-4xl font-black tracking-tight text-ink sm:text-5xl" data-testid="pricing-first-amount">
              {{ formatVenueFirstMonthlyPrice() }}
            </p>
            <p class="pb-1 text-base font-semibold text-ink-muted">/ month</p>
          </div>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
            After your account&apos;s free month. Full Flotory for your first location — same features, same support.
          </p>
        </div>

        <div class="rounded-3xl border border-accent-border/40 bg-surface-muted/70 p-6 sm:p-8">
          <p class="text-sm font-bold uppercase tracking-wide text-accent-active">Each next venue</p>
          <div class="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p class="text-4xl font-black tracking-tight text-ink sm:text-5xl" data-testid="pricing-additional-amount">
              {{ formatVenueAdditionalMonthlyPrice() }}
            </p>
            <p class="pb-1 text-base font-semibold text-ink-muted">/ month</p>
          </div>
          <p class="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
            Billed when the branch goes live — no extra trial. Grow to a second cafe or wine bar without paying full price again.
          </p>
        </div>
      </div>

      <section
        class="mt-10 rounded-3xl border border-border/80 bg-surface-muted/35 p-6 sm:p-8"
        data-testid="pricing-included-features"
      >
        <h2 class="text-lg font-black text-ink sm:text-xl">Everything included</h2>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          Every location gets the full product — first venue or additional branch. You only pay more when you add another site, not for extra features.
        </p>

        <ul class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="feature in pricingIncludedFeatures"
            :key="feature"
            class="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-3 text-sm leading-relaxed text-ink sm:text-base"
          >
            <Check class="mt-0.5 size-5 shrink-0 text-accent-active" :stroke-width="2.4" aria-hidden="true" />
            <span>{{ feature }}</span>
          </li>
        </ul>
      </section>

      <div class="mt-8 flex flex-wrap gap-3">
        <RouterLink to="/book-demo?utm_source=pricing&utm_campaign=plan">
          <AppButton size="lg">Book A Demo</AppButton>
        </RouterLink>
        <RouterLink to="/contact">
          <AppButton size="lg" variant="secondary">Contact Us</AppButton>
        </RouterLink>
      </div>

      <div class="mt-8 space-y-4 rounded-2xl border border-border/70 bg-surface-muted/40 p-5 text-sm leading-relaxed text-ink-muted sm:p-6 sm:text-base">
        <p>
          <strong class="font-semibold text-ink">Guests never pay.</strong>
          Your customers use the Flotory mobile app at no cost — stamps, progress, and rewards are always free for them.
        </p>
        <p>
          Example: after your free month, your first venue is {{ formatVenueFirstMonthlyPrice() }}/month. Add a second branch and pay
          {{ formatVenueAdditionalMonthlyPrice() }}/month for it when it launches.
        </p>
        <p>
          Questions?
          <RouterLink to="/faq" class="font-semibold text-ink hover:underline">Read the FAQ</RouterLink>
          or email us anytime.
        </p>
      </div>
    </AppCard>
  </MarketingPageShell>
</template>
