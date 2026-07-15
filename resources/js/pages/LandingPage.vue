<script setup lang="ts">
import { RouterLink } from 'vue-router'

import LandingBenefitsCarousel from '@/components/marketing/LandingBenefitsCarousel.vue'
import LandingHeroVisual from '@/components/marketing/LandingHeroVisual.vue'
import LandingHowItWorks from '@/components/marketing/LandingHowItWorks.vue'
import LandingProductShowcase from '@/components/marketing/LandingProductShowcase.vue'
import MarketingPageHeader from '@/components/layout/MarketingPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import MarketingFooter from '@/components/layout/MarketingFooter.vue'
import AppCard from '@/components/ui/AppCard.vue'

const trustPoints = [
  'NFC stamps at the counter',
  'No POS required',
  'Multi-location ready',
  'Onboarded in 1–3 business days',
]

</script>

<template>
  <main class="relative min-h-screen overflow-x-clip bg-marketing-page text-ink">
    <div class="pointer-events-none absolute inset-0 marketing-page-glow" />

    <MarketingPageHeader />

    <section class="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-16">
      <div class="space-y-6 text-center lg:text-left">
        <p
          class="mx-auto inline-flex rounded-full border border-accent-border/35 bg-accent-soft/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-active lg:mx-0"
          data-testid="landing-hero-tagline"
        >
          Built for the counter, not the queue
        </p>

        <h1 class="hero-heading mx-auto max-w-4xl text-4xl font-black tracking-tight text-ink sm:text-5xl lg:mx-0 lg:text-6xl">
          Turn first-time visitors into regulars.
        </h1>

        <p class="mx-auto max-w-2xl text-base leading-8 text-ink-muted sm:text-lg sm:leading-9 lg:mx-0 lg:text-xl lg:leading-9">
          Loyalty guests tap at the counter. Join from a QR, collect stamps with NFC, unlock rewards in the app.
          <span class="font-semibold text-ink">No POS. No staff scanner.</span>
        </p>

        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
          <RouterLink to="/book-demo?utm_source=landing&utm_campaign=hero">
            <AppButton size="lg" class="btn-glow w-full min-w-[11.5rem] sm:w-auto">
              Book A Demo
            </AppButton>
          </RouterLink>
          <RouterLink to="/contact">
            <AppButton size="lg" variant="secondary" class="w-full min-w-[11.5rem] sm:w-auto">
              Contact Us
            </AppButton>
          </RouterLink>
        </div>

        <p class="text-sm font-medium text-ink-muted sm:text-base">
          Personally onboarded · Typical launch in 1–3 business days
        </p>
      </div>

      <LandingHeroVisual class="mx-auto w-full max-w-md lg:max-w-none lg:mx-0" />
    </section>

    <section
      class="relative mx-auto max-w-6xl px-5 pb-8 sm:px-6 sm:pb-10"
      data-testid="landing-trust-strip"
    >
      <ul class="trust-strip">
        <li v-for="point in trustPoints" :key="point" class="trust-point">
          {{ point }}
        </li>
      </ul>
      <p class="trust-footnote">
        Built for independent cafes, wine bars, and bakeries.
      </p>
    </section>

    <section class="relative mx-auto max-w-6xl overflow-visible px-5 pb-16 sm:px-6 sm:pb-20 lg:pb-24">
      <LandingBenefitsCarousel />
    </section>

    <section class="relative mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20 lg:pb-24">
      <AppCard wrapper-class="border-border/70 bg-surface/95 p-8 sm:p-10 lg:p-12">
        <div class="mx-auto max-w-3xl text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-active sm:text-sm">Product overview</p>
          <h2 class="mt-3 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            Guest app, NFC stand, and owner dashboard — in one loop.
          </h2>
        </div>
        <div class="mt-8 lg:mt-10">
          <LandingProductShowcase />
        </div>
      </AppCard>
    </section>

    <section
      class="relative mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20 lg:pb-24"
      data-testid="landing-how-it-works"
    >
      <AppCard wrapper-class="border-border/70 bg-surface/95 p-8 sm:p-10 lg:p-12">
        <div class="mx-auto max-w-3xl text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-active sm:text-sm">How it works</p>
          <h2 class="mt-3 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            From first visit to reward redemption.
          </h2>
          <p class="mt-3 text-sm leading-7 text-ink-muted sm:text-base sm:leading-8">
            Guests join once, collect stamps with NFC, and redeem in the app. Owners set rewards from the web dashboard.
          </p>
        </div>
        <div class="mt-8 lg:mt-10">
          <LandingHowItWorks />
        </div>
      </AppCard>
    </section>

    <section class="relative mx-auto max-w-5xl px-5 pb-16 sm:px-6 sm:pb-24 lg:pb-28">
      <AppCard wrapper-class="border-primary/10 bg-gradient-to-br from-primary via-primary to-primary-soft px-8 py-12 text-center text-primary-text sm:px-12 sm:py-14 lg:px-14 lg:py-16">
        <h2 class="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
          Ready to launch at your venue?
        </h2>
        <p class="mx-auto mt-4 max-w-lg text-sm leading-8 text-ink-soft sm:mt-5 sm:text-base lg:text-lg">
          Every venue is personally onboarded by the Flotory team. We set up rewards, NFC stands, and listing review — typically within 1–3 business days.
        </p>
        <div class="mt-9 flex flex-col items-center justify-center gap-4 sm:mt-10 sm:flex-row lg:mt-12">
          <RouterLink to="/book-demo?utm_source=landing&utm_campaign=footer">
            <AppButton size="lg" variant="secondary" class="btn-glow w-full min-w-[11.5rem] border-accent-border/40 sm:w-auto">
              Book A Demo
            </AppButton>
          </RouterLink>
          <RouterLink to="/contact">
            <AppButton size="lg" variant="ghost" class="w-full min-w-[11.5rem] text-primary-text hover:bg-white/10 hover:text-primary-text sm:w-auto">
              Contact Us
            </AppButton>
          </RouterLink>
        </div>
        <p class="mt-6 text-sm font-semibold text-ink-soft/85">
          <RouterLink to="/pricing" class="font-bold underline decoration-accent/70 underline-offset-2">
            1 month free
          </RouterLink>
          · then 9,900 AMD first venue · 4,900 AMD each next branch
        </p>
        <p class="mt-3 text-sm font-semibold text-ink-soft/85">
          Questions before you book?
          <RouterLink to="/faq" class="font-bold underline decoration-accent/70 underline-offset-2">
            Read the FAQ
          </RouterLink>
        </p>
        <p class="mt-3 text-sm font-semibold text-ink-soft/85">
          Already have an account?
          <RouterLink to="/login" class="font-bold underline decoration-accent/70 underline-offset-2">
            Log in
          </RouterLink>
        </p>
      </AppCard>
    </section>

    <section class="relative mx-auto max-w-5xl px-5 pb-12 sm:px-6 sm:pb-16">
      <MarketingFooter />
    </section>
  </main>
</template>

<style scoped>
.hero-heading {
  text-wrap: balance;
  line-height: 1.06;
  letter-spacing: -0.04em;
}

.trust-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.55rem 0.75rem;
}

.trust-point {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--flotory-accent-border) 35%, var(--flotory-border));
  background: color-mix(in srgb, var(--flotory-surface) 92%, transparent);
  padding: 0.45rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--flotory-ink-muted);
}

.trust-point::before {
  content: '';
  width: 0.4rem;
  height: 0.4rem;
  margin-right: 0.45rem;
  border-radius: 9999px;
  background: var(--flotory-accent);
}

.trust-footnote {
  margin-top: 0.85rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--flotory-ink-soft);
}

@media (max-width: 640px) {
  .hero-heading {
    line-height: 1.1;
  }
}
</style>
