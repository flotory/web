<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Nfc, Smartphone, Store } from '@lucide/vue'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import LandingHeroVisual from '@/components/marketing/LandingHeroVisual.vue'
import LandingHowItWorks from '@/components/marketing/LandingHowItWorks.vue'
import LandingProductShowcase from '@/components/marketing/LandingProductShowcase.vue'
import AppButton from '@/components/ui/AppButton.vue'
import MarketingFooter from '@/components/layout/MarketingFooter.vue'
import AppCard from '@/components/ui/AppCard.vue'

const trustPoints = [
  'NFC stamps at the counter',
  'No POS required',
  'Multi-location ready',
  'Onboarded in 1–3 business days',
]

const features = [
  {
    icon: Smartphone,
    title: 'Guest stamp cards',
    copy: 'Digital loyalty in the Flotory app — join from QR or discover.',
  },
  {
    icon: Nfc,
    title: 'NFC at the counter',
    copy: 'One tap adds one stamp. No POS integration and no staff scanner.',
  },
  {
    icon: Store,
    title: 'Owner dashboard',
    copy: 'Visits, rewards, and branches in one place — with hands-on launch support from our team.',
  },
]

</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-marketing-page text-ink">
    <div class="pointer-events-none absolute inset-0 marketing-page-glow" />

    <header class="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 pt-8 sm:px-6 sm:pt-10">
      <RouterLink to="/">
        <FlotoryLogo size="lg" />
      </RouterLink>
      <div class="flex items-center gap-2">
        <RouterLink to="/book-demo" class="hidden sm:inline-flex">
          <AppButton variant="ghost">Book a demo</AppButton>
        </RouterLink>
        <RouterLink to="/login" class="hidden md:inline-flex">
          <AppButton variant="ghost">Log in</AppButton>
        </RouterLink>
        <RouterLink to="/book-demo">
          <AppButton size="sm" class="btn-glow">Book a demo</AppButton>
        </RouterLink>
      </div>
    </header>

    <section class="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-20">
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
              Book a demo
            </AppButton>
          </RouterLink>
          <RouterLink to="/contact">
            <AppButton size="lg" variant="secondary" class="w-full min-w-[11.5rem] sm:w-auto">
              Contact us
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

    <section class="relative mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20 lg:pb-24">
      <div class="feature-grid">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="feature-card"
        >
          <div class="feature-icon">
            <component :is="feature.icon" :size="24" :stroke-width="2.2" />
          </div>
          <h2 class="mt-5 text-lg font-bold text-ink sm:text-xl">{{ feature.title }}</h2>
          <p class="mt-2 text-sm leading-7 text-ink-muted sm:text-base sm:leading-7">{{ feature.copy }}</p>
        </article>
      </div>
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
              Book a demo
            </AppButton>
          </RouterLink>
          <RouterLink to="/contact">
            <AppButton size="lg" variant="ghost" class="w-full min-w-[11.5rem] text-primary-text hover:bg-white/10 hover:text-primary-text sm:w-auto">
              Contact us
            </AppButton>
          </RouterLink>
        </div>
        <p class="mt-6 text-sm font-semibold text-ink-soft/85">
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

.feature-grid {
  display: grid;
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .feature-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.75rem;
  }
}

.feature-card {
  border-radius: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 75%, transparent);
  background: color-mix(in srgb, var(--flotory-surface) 92%, transparent);
  padding: 1.75rem 1.5rem;
  box-shadow: 0 10px 30px color-mix(in srgb, var(--flotory-primary) 5%, transparent);
}

@media (min-width: 768px) {
  .feature-card {
    padding: 2rem 1.75rem;
  }
}

.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: var(--flotory-accent-soft);
  color: var(--flotory-accent-active);
}

.btn-glow {
  box-shadow: 0 8px 22px color-mix(in srgb, var(--flotory-accent) 35%, transparent);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.btn-glow:hover {
  box-shadow: 0 10px 28px color-mix(in srgb, var(--flotory-accent) 45%, transparent);
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .hero-heading {
    line-height: 1.1;
  }
}
</style>
