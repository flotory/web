<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'

const trustPoints = [
  'Mobile app for guests',
  'Setup in minutes',
  'Easy for staff',
  'Owner web dashboard',
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
    copy: 'They join in the Flotory mobile app after scanning your QR.',
    image:
      'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Staff scan My QR for stamps',
    copy: 'One guest QR works at every venue they have joined. Staff scan from the mobile app — built for rush hour.',
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
  <main class="relative min-h-screen overflow-hidden bg-primary text-white">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.14),transparent_35%)]" />
    <div class="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/20 blur-[120px] soft-drift" />

    <header class="relative mx-auto flex max-w-6xl items-center justify-between px-4 pt-8 sm:pt-10">
      <RouterLink to="/">
        <FlotoryLogo size="lg" inverted />
      </RouterLink>
      <div class="flex items-center gap-2">
        <RouterLink to="/login">
          <AppButton variant="ghost" class="text-white border border-white/20 hover:bg-surface/10 hover:text-white">Log in</AppButton>
        </RouterLink>
        <RouterLink to="/register?intent=owner">
          <AppButton variant="secondary" size="sm" class="btn-glow">Start free</AppButton>
        </RouterLink>
      </div>
    </header>

    <section class="relative mx-auto grid max-w-6xl gap-12 px-4 py-10 sm:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-20">
      <div class="space-y-9">
        <p class="inline-flex rounded-full bg-surface/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft border border-white/15">
          Built for cafes, bars, and restaurants
        </p>
        <div class="space-y-6">
          <h1 class="hero-heading text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Turn first-time visitors into regulars.
          </h1>
          <p class="max-w-xl text-base leading-8 text-ink-soft sm:text-lg">
            Digital stamp cards guests join from your table QR — one My QR for stamps, a separate claim QR for rewards. Simple for your team, built for repeat visits.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <RouterLink to="/register?intent=owner">
            <AppButton size="lg" variant="secondary" class="btn-glow">Start free</AppButton>
          </RouterLink>
          <a href="#how-it-works">
            <AppButton size="lg" variant="ghost" class="w-full text-white border border-white/20 hover:bg-surface/10 hover:text-white sm:w-auto">
              See how it works
            </AppButton>
          </a>
        </div>
      </div>

      <div class="relative floating-phone">
        <div class="absolute -inset-6 rounded-[2.25rem] bg-gradient-to-br from-primary/25 to-sky-500/15 blur-3xl" />
        <AppCard wrapper-class="hero-shell relative overflow-hidden border-white/15 bg-surface/6 p-4 backdrop-blur-xl">
          <div class="mb-4 overflow-hidden rounded-[1.5rem]">
            <img
              src="https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80"
              alt="Warm cafe environment"
              class="h-44 w-full object-cover sm:h-56"
            >
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="hover-lift rounded-2xl bg-primary/85 p-4 border border-white/10">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Table QR stand</p>
              <div class="mt-3 flex items-center gap-3">
                <div class="grid size-12 place-items-center rounded-xl bg-surface text-ink">
                  <span class="text-xl font-black">▦</span>
                </div>
                <p class="text-sm text-primary-text/80">Guests scan in seconds</p>
              </div>
            </div>
            <div class="hover-lift rounded-2xl bg-primary/85 p-4 border border-white/10">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Guest progress</p>
              <p class="mt-3 text-lg font-black shimmer-stars">⭐⭐⭐☆☆</p>
              <p class="text-sm text-success">One stamp away from a free coffee</p>
            </div>
            <div class="hover-lift rounded-2xl bg-primary/85 p-4 border border-white/10 sm:col-span-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">At the counter</p>
                <span class="inline-flex h-2.5 w-2.5 rounded-full bg-success soft-pulse" />
              </div>
              <p class="mt-2 text-sm text-primary-text/80">Staff scan My QR — stamp added, guest sees progress update.</p>
            </div>
          </div>
        </AppCard>
      </div>
    </section>

    <section class="reveal relative border-y border-white/10 bg-surface/[0.02]">
      <div class="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-4">
        <div v-for="item in trustPoints" :key="item" class="rounded-2xl bg-surface/5 px-3 py-3 text-center text-sm font-semibold text-primary-text/80 border border-white/10">
          {{ item }}
        </div>
      </div>
    </section>

    <section id="how-it-works" class="reveal relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <div class="mb-10 space-y-3 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">How It Works</p>
        <h2 class="text-3xl font-black tracking-tight sm:text-5xl">Simple for teams. Powerful for retention.</h2>
      </div>
      <div class="grid gap-5 md:grid-cols-2">
        <article v-for="(step, idx) in flowSteps" :key="step.title" class="hover-lift overflow-hidden rounded-[1.8rem] border border-white/10 bg-surface/[0.04]">
          <img :src="step.image" :alt="step.title" class="h-48 w-full object-cover sm:h-56">
          <div class="space-y-3 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">Step {{ idx + 1 }}</p>
            <h3 class="text-2xl font-black">{{ step.title }}</h3>
            <p class="text-sm leading-7 text-ink-soft">{{ step.copy }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <AppCard wrapper-class="overflow-hidden border-white/10 bg-gradient-to-br from-primary/90 to-primary-soft/80 p-0">
        <div class="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div class="space-y-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">Rewards guests notice</p>
            <h2 class="text-3xl font-black tracking-tight sm:text-5xl">Progress that guests want to complete.</h2>
            <p class="max-w-xl text-sm leading-8 text-ink-soft sm:text-base">
              Flotory turns stamps into visible progress, milestones, and celebration moments that keep guests coming back.
            </p>
          </div>
          <div class="grid gap-3">
            <div class="hover-lift rounded-2xl bg-primary/70 p-4 border border-white/10">
              <p class="text-sm font-semibold text-primary-text/80">Progress toward next reward</p>
              <p class="mt-2 text-2xl font-black shimmer-stars">⭐⭐⭐☆☆</p>
              <p class="text-sm text-success">Clear countdown to the next milestone</p>
            </div>
            <div class="hover-lift rounded-2xl bg-primary/70 p-4 border border-white/10">
              <p class="text-sm font-semibold text-primary-text/80">Milestone unlocked</p>
              <p class="mt-2 text-lg font-black text-accent">Reward unlocked: House dessert</p>
              <p class="text-sm text-ink-soft">A moment guests remember — and talk about.</p>
            </div>
          </div>
        </div>
      </AppCard>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <div class="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <AppCard wrapper-class="border-white/10 bg-surface/[0.04]">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">Staff Experience</p>
          <h2 class="mt-4 text-3xl font-black tracking-tight">Built for busy staff.</h2>
          <p class="mt-3 text-sm leading-8 text-ink-soft sm:text-base">Staff use the Flotory mobile app — built for rush-hour lines.</p>
          <div class="mt-6 space-y-3">
            <div class="hover-lift rounded-2xl bg-primary/70 p-4 border border-white/10">
              <p class="text-sm font-semibold text-primary-text/80">1) Open the mobile scanner</p>
            </div>
            <div class="hover-lift rounded-2xl bg-primary/70 p-4 border border-white/10">
              <p class="text-sm font-semibold text-primary-text/80">2) Scan the guest’s My QR</p>
            </div>
            <div class="hover-lift rounded-2xl bg-primary/70 p-4 border border-white/10">
              <p class="text-sm font-semibold text-success">3) Stamp added — claim QR is separate for rewards</p>
            </div>
          </div>
        </AppCard>
        <div class="overflow-hidden rounded-[2rem] border border-white/10">
          <img
            src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1400&q=80"
            alt="Staff using scanner at counter"
            class="h-full min-h-72 w-full object-cover"
          >
        </div>
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <AppCard wrapper-class="border-white/10 bg-surface/[0.04]">
        <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">Analytics</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight sm:text-5xl">See what brings guests back.</h2>
            <p class="mt-4 max-w-xl text-sm leading-8 text-ink-soft sm:text-base">
              Visits, returning guests, reward redemptions, and active stamp campaigns in one dashboard — so you know what’s working.
            </p>
          </div>
          <div class="rounded-3xl bg-gradient-to-b from-primary/80 to-primary/70 p-4 border border-white/10">
            <p class="mb-3 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Example dashboard</p>
            <div class="mb-4 rounded-2xl bg-surface/[0.04] p-3 border border-white/10">
              <div class="flex items-end gap-2">
                <div class="h-8 w-2 rounded-full bg-accent/80" />
                <div class="h-12 w-2 rounded-full bg-accent/60" />
                <div class="h-10 w-2 rounded-full bg-accent/70" />
                <div class="h-16 w-2 rounded-full bg-accent/90" />
                <div class="h-11 w-2 rounded-full bg-accent/70" />
                <div class="h-14 w-2 rounded-full bg-accent/85" />
                <div class="h-9 w-2 rounded-full bg-accent/60" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="metric in analyticsMetrics" :key="metric.label" class="hover-lift rounded-2xl bg-surface/5 p-3 border border-white/10">
                <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">{{ metric.label }}</p>
                <p class="mt-2 text-lg font-black text-white">{{ metric.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <div class="space-y-4 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">Physical Venue Experience</p>
        <h2 class="text-3xl font-black tracking-tight sm:text-5xl">Turn every table into a loyalty entry point.</h2>
      </div>
      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <img class="hover-lift h-52 w-full rounded-3xl object-cover border border-white/10" src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80" alt="QR table stand">
        <img class="hover-lift h-52 w-full rounded-3xl object-cover border border-white/10" src="https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1000&q=80" alt="Counter display">
        <img class="hover-lift h-52 w-full rounded-3xl object-cover border border-white/10" src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1000&q=80" alt="Hospitality poster and ambience">
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-14 sm:pb-16">
      <div class="rounded-3xl border border-white/10 bg-surface/[0.03] px-5 py-6 sm:px-8">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Made for independent hospitality</p>
        <div class="mt-4 grid grid-cols-2 gap-3 text-sm font-semibold text-ink-soft sm:grid-cols-5">
          <div v-for="name in venueTypes" :key="name" class="rounded-xl bg-surface/[0.04] px-3 py-2 text-center border border-white/10">
            {{ name }}
          </div>
        </div>
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-5xl px-4 pb-20 sm:pb-24">
      <AppCard wrapper-class="border-white/10 bg-gradient-to-r from-primary/95 to-primary/60 text-center">
        <h2 class="text-3xl font-black tracking-tight sm:text-5xl">Launch your loyalty program in minutes.</h2>
        <p class="mx-auto mt-4 max-w-lg text-sm leading-7 text-ink-soft">
          Create your venue, add rewards, and print a QR in minutes. Go public for guests after a quick listing review.
        </p>
        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <RouterLink to="/register?intent=owner">
            <AppButton size="lg" variant="secondary" class="btn-glow">Start free</AppButton>
          </RouterLink>
          <RouterLink to="/login">
            <AppButton size="lg" variant="ghost" class="text-white border border-white/25 hover:bg-surface/10 hover:text-white">Log in</AppButton>
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

.hero-heading {
  text-wrap: balance;
  line-height: 1.03;
  letter-spacing: -0.04em;
}

.floating-phone {
  animation: float-card 6.5s ease-in-out infinite;
}

.hero-shell {
  box-shadow: 0 20px 60px rgba(8, 15, 30, 0.45);
}

.btn-glow {
  box-shadow: 0 8px 22px rgba(255, 255, 255, 0.2);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.btn-glow:hover {
  box-shadow: 0 10px 26px rgba(129, 140, 248, 0.35);
  transform: translateY(-1px);
}

.hover-lift {
  transition: transform 0.26s ease, box-shadow 0.26s ease;
}

.hover-lift:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 25px rgba(6, 14, 30, 0.34);
}

.shimmer-stars {
  background: linear-gradient(90deg, #fde68a, #ffffff, #fde68a);
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
    transform: translate(-50%, 0);
  }
  50% {
    transform: translate(-48%, 8px);
  }
}

@keyframes soft-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(74, 222, 128, 0);
    transform: scale(1.08);
  }
}

@media (max-width: 640px) {
  .hero-heading {
    line-height: 1.06;
  }
}
</style>
