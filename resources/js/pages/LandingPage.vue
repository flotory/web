<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'

const trustPoints = [
  'Browser or app',
  'Setup in minutes',
  'Easy for staff',
  'Works on any phone',
]

const flowSteps = [
  {
    title: 'Place QR in your venue',
    copy: 'Add table stands, posters, or counter cards once. Complete your listing profile and go public after a quick review.',
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Guests scan and join',
    copy: 'They join on any phone in the browser — or use the optional Flotory app if they prefer.',
    image:
      'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Staff scan My QR for stamps',
    copy: 'One guest QR works at every venue they have joined. Open scanner, scan once, confirm — built for rush hour.',
    image:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Unlock, claim, and return',
    copy: 'Milestones unlock as guests collect stamps. To redeem, they tap Claim and show a separate QR at the counter.',
    image:
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80',
  },
]

const analyticsMetrics = [
  { label: 'Visits this month', value: '↑ trend' },
  { label: 'Returning guests', value: 'Insights' },
  { label: 'Rewards redeemed', value: 'Track rate' },
  { label: 'Top milestone', value: 'Your pick' },
]

const venueTypes = ['Neighborhood café', 'Wine bar', 'Bistro', 'Bakery', 'Cocktail bar']

let revealObserver: IntersectionObserver | null = null

onMounted(() => {
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          revealObserver?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.16 },
  )

  document.querySelectorAll('.reveal').forEach((node) => revealObserver?.observe(node))
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  revealObserver = null
})
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-marketing-page text-ink">
    <div class="pointer-events-none absolute inset-0 marketing-page-glow" />
    <div class="pointer-events-none absolute -top-16 right-[8%] h-80 w-80 rounded-full bg-accent-soft/70 blur-[100px] soft-drift" />
    <div class="pointer-events-none absolute top-[38%] -left-24 h-72 w-72 rounded-full bg-accent/15 blur-[90px]" />

    <header class="relative mx-auto flex max-w-6xl items-center justify-between px-4 pt-8 sm:pt-10">
      <RouterLink to="/">
        <FlotoryLogo size="lg" />
      </RouterLink>
      <div class="flex items-center gap-2">
        <RouterLink to="/book-demo">
          <AppButton variant="ghost">Book a demo</AppButton>
        </RouterLink>
        <RouterLink to="/login">
          <AppButton variant="ghost">Log in</AppButton>
        </RouterLink>
        <RouterLink to="/register?intent=owner">
          <AppButton size="sm" class="btn-glow">Start free</AppButton>
        </RouterLink>
      </div>
    </header>

    <section class="relative mx-auto grid max-w-6xl gap-12 px-4 py-10 sm:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-20">
      <div class="space-y-9">
        <p class="inline-flex rounded-full border border-accent-border/35 bg-accent-soft/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-active">
          Built for cafes, bars, and restaurants
        </p>
        <div class="space-y-6">
          <h1 class="hero-heading text-5xl font-black tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Turn first-time visitors into regulars.
          </h1>
          <p class="max-w-xl text-base leading-8 text-ink-muted sm:text-lg">
            Digital stamp cards guests join from your table QR — one My QR for stamps, a separate claim QR for rewards. Simple for your team, built for repeat visits.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <RouterLink to="/register?intent=owner">
            <AppButton size="lg" class="btn-glow">Start free</AppButton>
          </RouterLink>
          <RouterLink to="/book-demo?utm_source=landing&utm_campaign=hero">
            <AppButton size="lg" variant="secondary" class="w-full sm:w-auto">
              Book a demo
            </AppButton>
          </RouterLink>
          <a href="#how-it-works">
            <AppButton size="lg" variant="ghost" class="w-full sm:w-auto">
              See how it works
            </AppButton>
          </a>
        </div>
        <p class="text-sm font-semibold text-ink-muted">30-minute walkthrough — no signup required.</p>
      </div>

      <div class="relative floating-phone">
        <div class="absolute -inset-6 rounded-[2.25rem] bg-gradient-to-br from-accent-soft/80 to-accent/25 blur-3xl" />
        <AppCard wrapper-class="hero-shell relative overflow-hidden border-accent-border/25 bg-surface p-4">
          <div class="mb-4 overflow-hidden rounded-[1.5rem]">
            <img
              src="https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80"
              alt="Warm cafe environment"
              class="h-44 w-full object-cover sm:h-56"
            >
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="hover-lift rounded-2xl border border-border bg-surface-muted p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Table QR stand</p>
              <div class="mt-3 flex items-center gap-3">
                <div class="grid size-12 place-items-center rounded-xl bg-primary text-primary-text">
                  <span class="text-xl font-black">▦</span>
                </div>
                <p class="text-sm text-ink-muted">Guests scan in seconds</p>
              </div>
            </div>
            <div class="hover-lift rounded-2xl border border-border bg-surface-muted p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Guest progress</p>
              <p class="mt-3 text-lg font-black shimmer-stars">⭐⭐⭐☆☆</p>
              <p class="text-sm font-semibold text-success-text">One stamp away from a free coffee</p>
            </div>
            <div class="hover-lift rounded-2xl border border-border bg-surface-muted p-4 sm:col-span-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">At the counter</p>
                <span class="inline-flex h-2.5 w-2.5 rounded-full bg-success soft-pulse" />
              </div>
              <p class="mt-2 text-sm text-ink-muted">Staff scan My QR — stamp added, guest sees progress update.</p>
            </div>
          </div>
        </AppCard>
      </div>
    </section>

    <section class="reveal relative">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-8 sm:gap-4">
        <div
          v-for="item in trustPoints"
          :key="item"
          class="trust-pill"
        >
          {{ item }}
        </div>
      </div>
    </section>

    <section id="how-it-works" class="reveal relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <div class="mb-10 space-y-3 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-active">How It Works</p>
        <h2 class="text-3xl font-black tracking-tight text-ink sm:text-5xl">Simple for teams. Powerful for retention.</h2>
      </div>
      <div class="grid gap-5 md:grid-cols-2">
        <article
          v-for="(step, idx) in flowSteps"
          :key="step.title"
          class="hover-lift overflow-hidden rounded-[1.8rem] border border-border bg-surface"
        >
          <img :src="step.image" :alt="step.title" class="h-48 w-full object-cover sm:h-56">
          <div class="space-y-3 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-active">Step {{ idx + 1 }}</p>
            <h3 class="text-2xl font-black text-ink">{{ step.title }}</h3>
            <p class="text-sm leading-7 text-ink-muted">{{ step.copy }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <AppCard wrapper-class="overflow-hidden border-primary/10 bg-gradient-to-br from-primary to-primary-soft p-0 text-primary-text">
        <div class="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div class="space-y-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">Rewards guests notice</p>
            <h2 class="text-3xl font-black tracking-tight sm:text-5xl">Progress that guests want to complete.</h2>
            <p class="max-w-xl text-sm leading-8 text-ink-soft sm:text-base">
              Flotory turns stamps into visible progress, milestones, and celebration moments that keep guests coming back.
            </p>
          </div>
          <div class="grid gap-3">
            <div class="hover-lift rounded-2xl border border-white/10 bg-primary-soft/80 p-4">
              <p class="text-sm font-semibold text-ink-soft">Progress toward next reward</p>
              <p class="mt-2 text-2xl font-black shimmer-stars">⭐⭐⭐☆☆</p>
              <p class="text-sm font-semibold text-success-bg">Clear countdown to the next milestone</p>
            </div>
            <div class="hover-lift rounded-2xl border border-accent-border/40 bg-primary-soft/80 p-4">
              <p class="text-sm font-semibold text-ink-soft">Milestone unlocked</p>
              <p class="mt-2 text-lg font-black text-accent">Reward unlocked: House dessert</p>
              <p class="text-sm text-ink-soft">A moment guests remember — and talk about.</p>
            </div>
          </div>
        </div>
      </AppCard>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <div class="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <AppCard>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-active">Staff Experience</p>
          <h2 class="mt-4 text-3xl font-black tracking-tight text-ink">Built for busy staff.</h2>
          <p class="mt-3 text-sm leading-8 text-ink-muted sm:text-base">One tap to open the scanner — built for rush-hour lines.</p>
          <div class="mt-6 space-y-3">
            <div class="hover-lift rounded-2xl border border-border bg-surface-muted p-4">
              <p class="text-sm font-semibold text-ink">1) Open scanner</p>
            </div>
            <div class="hover-lift rounded-2xl border border-border bg-surface-muted p-4">
              <p class="text-sm font-semibold text-ink">2) Scan the guest’s My QR</p>
            </div>
            <div class="hover-lift rounded-2xl border border-success-border bg-success-bg/60 p-4">
              <p class="text-sm font-semibold text-success-text">3) Stamp added — claim QR is separate for rewards</p>
            </div>
          </div>
        </AppCard>
        <div class="overflow-hidden rounded-[2rem] border border-border">
          <img
            src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1400&q=80"
            alt="Staff using scanner at counter"
            class="h-full min-h-72 w-full object-cover"
          >
        </div>
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <AppCard>
        <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-active">Analytics</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-ink sm:text-5xl">See what brings guests back.</h2>
            <p class="mt-4 max-w-xl text-sm leading-8 text-ink-muted sm:text-base">
              Visits, returning guests, reward redemptions, and active stamp campaigns in one dashboard — so you know what’s working.
            </p>
          </div>
          <div class="rounded-3xl border border-border bg-surface-muted p-4">
            <p class="mb-3 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Example dashboard</p>
            <div class="mb-4 rounded-2xl border border-border bg-surface p-3">
              <div class="flex items-end gap-2">
                <div class="h-8 w-2 rounded-full bg-accent/80" />
                <div class="h-12 w-2 rounded-full bg-accent/60" />
                <div class="h-10 w-2 rounded-full bg-accent/70" />
                <div class="h-16 w-2 rounded-full bg-accent" />
                <div class="h-11 w-2 rounded-full bg-accent/70" />
                <div class="h-14 w-2 rounded-full bg-accent/85" />
                <div class="h-9 w-2 rounded-full bg-accent/60" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div
                v-for="metric in analyticsMetrics"
                :key="metric.label"
                class="hover-lift rounded-2xl border border-border bg-surface p-3"
              >
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">{{ metric.label }}</p>
                <p class="mt-2 text-lg font-black text-ink">{{ metric.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <div class="space-y-4 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-active">Physical Venue Experience</p>
        <h2 class="text-3xl font-black tracking-tight text-ink sm:text-5xl">Turn every table into a loyalty entry point.</h2>
      </div>
      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <img class="hover-lift h-52 w-full rounded-3xl border border-border object-cover" src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80" alt="QR table stand">
        <img class="hover-lift h-52 w-full rounded-3xl border border-border object-cover" src="https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1000&q=80" alt="Counter display">
        <img class="hover-lift h-52 w-full rounded-3xl border border-border object-cover" src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1000&q=80" alt="Hospitality poster and ambience">
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-14 sm:pb-16">
      <div class="rounded-3xl border border-border bg-surface px-5 py-6 sm:px-8">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Made for independent hospitality</p>
        <div class="mt-4 grid grid-cols-2 gap-3 text-sm font-semibold text-ink-muted sm:grid-cols-5">
          <div
            v-for="name in venueTypes"
            :key="name"
            class="rounded-xl border border-border bg-surface-muted px-3 py-2 text-center"
          >
            {{ name }}
          </div>
        </div>
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-5xl px-4 pb-20 sm:pb-24">
      <AppCard wrapper-class="border-primary/10 bg-gradient-to-r from-primary via-primary to-primary-soft text-center text-primary-text">
        <h2 class="text-3xl font-black tracking-tight sm:text-5xl">Launch your loyalty program in minutes.</h2>
        <p class="mx-auto mt-4 max-w-lg text-sm leading-7 text-ink-soft">
          Create your venue, add rewards, and print a QR in minutes. Go public for guests after a quick listing review.
        </p>
        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <RouterLink to="/register?intent=owner">
            <AppButton size="lg" variant="secondary" class="btn-glow border-accent-border/40">Start free</AppButton>
          </RouterLink>
          <RouterLink to="/book-demo?utm_source=landing&utm_campaign=footer">
            <AppButton size="lg" variant="ghost" class="text-primary-text hover:bg-white/10 hover:text-primary-text">
              Book a demo
            </AppButton>
          </RouterLink>
          <RouterLink to="/login">
            <AppButton size="lg" variant="ghost" class="text-primary-text hover:bg-white/10 hover:text-primary-text">
              Log in
            </AppButton>
          </RouterLink>
        </div>
      </AppCard>
    </section>
  </main>
</template>

<style scoped>
.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 0.9s ease, transform 0.9s ease;
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.trust-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.15rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--flotory-ink-muted);
}

.trust-pill::before {
  content: '';
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 9999px;
  background: var(--flotory-accent);
  flex-shrink: 0;
}

.hero-heading {
  text-wrap: balance;
  line-height: 1.03;
  letter-spacing: -0.04em;
}

.floating-phone {
  animation: float-card 6.5s ease-in-out infinite;
}

.hero-shell {
  box-shadow: 0 20px 50px color-mix(in srgb, var(--flotory-primary) 12%, transparent);
}

.btn-glow {
  box-shadow: 0 8px 22px color-mix(in srgb, var(--flotory-accent) 35%, transparent);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.btn-glow:hover {
  box-shadow: 0 10px 28px color-mix(in srgb, var(--flotory-accent) 45%, transparent);
  transform: translateY(-1px);
}

.hover-lift {
  transition: transform 0.26s ease, box-shadow 0.26s ease;
}

.hover-lift:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 25px color-mix(in srgb, var(--flotory-primary) 10%, transparent);
}

.shimmer-stars {
  background: linear-gradient(90deg, var(--flotory-accent-active), var(--flotory-accent-soft), var(--flotory-accent-active));
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: star-shimmer 3s linear infinite;
}

.soft-drift {
  animation: ambient-drift 9s ease-in-out infinite;
}

.soft-pulse {
  animation: soft-pulse 2.3s ease-in-out infinite;
}

@keyframes float-card {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes star-shimmer {
  to {
    background-position: 200% center;
  }
}

@keyframes ambient-drift {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(8px, 10px);
  }
}

@keyframes soft-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--flotory-success) 45%, transparent);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px color-mix(in srgb, var(--flotory-success) 0%, transparent);
    transform: scale(1.08);
  }
}

@media (max-width: 640px) {
  .hero-heading {
    line-height: 1.06;
  }
}
</style>
