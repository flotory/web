<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'

const trustPoints = [
  'No app download',
  'Setup in minutes',
  'Easy for staff',
  'Works on any phone',
]

const flowSteps = [
  {
    title: 'Place QR in venue',
    copy: 'Add table stands, posters, or counter cards once and start collecting stamps.',
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Customers scan and join instantly',
    copy: 'Guests open a digital loyalty card in seconds and start collecting stamps immediately.',
    image:
      'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Staff add stamps in seconds',
    copy: 'Open scanner, scan once, confirm. Fast enough for rush hour service.',
    image:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Guests unlock rewards and return',
    copy: 'Progress bars and milestone rewards turn occasional visitors into regulars.',
    image:
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80',
  },
]

const analyticsMetrics = [
  { label: 'Repeat stamps', value: '+34%' },
  { label: 'Active customers', value: '1,248' },
  { label: 'Redemption rate', value: '22%' },
  { label: 'Top reward', value: 'Free latte' },
]

const socialProof = ['North Roast', 'Sora Bar', 'Olive Kitchen', 'Mira Bakery', 'Harbor Lounge']

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
  <main class="relative min-h-screen overflow-hidden bg-slate-950 text-white">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.14),transparent_35%)]" />
    <div class="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-400/20 blur-[120px] soft-drift" />

    <header class="relative mx-auto flex max-w-6xl items-center justify-between px-4 pt-8 sm:pt-10">
      <RouterLink to="/">
        <FlotoryLogo size="lg" inverted />
      </RouterLink>
      <div class="flex items-center gap-2">
        <RouterLink to="/login">
          <AppButton variant="ghost" class="text-white ring-1 ring-white/20 hover:bg-white/10 hover:text-white">Log in</AppButton>
        </RouterLink>
        <RouterLink to="/register?intent=owner">
          <AppButton variant="secondary" size="sm" class="btn-glow">Start free</AppButton>
        </RouterLink>
      </div>
    </header>

    <section class="relative mx-auto grid max-w-6xl gap-12 px-4 py-10 sm:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-20">
      <div class="space-y-9">
        <p class="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100 ring-1 ring-white/15">
          Built for cafes, bars, and restaurants
        </p>
        <div class="space-y-6">
          <h1 class="hero-heading text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Turn first-time visitors into regulars.
          </h1>
          <p class="max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            Digital loyalty cards, QR rewards, and customer retention tools designed for cafes, bars, and restaurants.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <RouterLink to="/register?intent=owner">
            <AppButton size="lg" variant="secondary" class="btn-glow">Start free</AppButton>
          </RouterLink>
          <a href="#how-it-works">
            <AppButton size="lg" variant="ghost" class="w-full text-white ring-1 ring-white/20 hover:bg-white/10 hover:text-white sm:w-auto">
              See how it works
            </AppButton>
          </a>
        </div>
      </div>

      <div class="relative floating-phone">
        <div class="absolute -inset-6 rounded-[2.25rem] bg-gradient-to-br from-indigo-500/25 to-sky-500/15 blur-3xl" />
        <AppCard wrapper-class="hero-shell relative overflow-hidden border-white/15 bg-white/6 p-4 backdrop-blur-xl">
          <div class="mb-4 overflow-hidden rounded-[1.5rem]">
            <img
              src="https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80"
              alt="Warm cafe environment"
              class="h-44 w-full object-cover sm:h-56"
            >
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="hover-lift rounded-2xl bg-slate-900/85 p-4 ring-1 ring-white/10">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-300">Table QR stand</p>
              <div class="mt-3 flex items-center gap-3">
                <div class="grid size-12 place-items-center rounded-xl bg-white text-slate-900">
                  <span class="text-xl font-black">▦</span>
                </div>
                <p class="text-sm text-slate-200">Guests scan in seconds</p>
              </div>
            </div>
            <div class="hover-lift rounded-2xl bg-slate-900/85 p-4 ring-1 ring-white/10">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-300">Customer progress</p>
              <p class="mt-3 text-lg font-black shimmer-stars">⭐⭐⭐☆☆</p>
              <p class="text-sm text-emerald-300">2 stamps until free cocktail</p>
            </div>
            <div class="hover-lift rounded-2xl bg-slate-900/85 p-4 ring-1 ring-white/10 sm:col-span-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-300">Scanner success</p>
                <span class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 soft-pulse" />
              </div>
              <p class="mt-2 text-sm text-slate-200">Open scanner. Scan QR. Done in seconds.</p>
            </div>
          </div>
        </AppCard>
      </div>
    </section>

    <section class="reveal relative border-y border-white/10 bg-white/[0.02]">
      <div class="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-4">
        <div v-for="item in trustPoints" :key="item" class="rounded-2xl bg-white/5 px-3 py-3 text-center text-sm font-semibold text-slate-200 ring-1 ring-white/10">
          {{ item }}
        </div>
      </div>
    </section>

    <section id="how-it-works" class="reveal relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <div class="mb-10 space-y-3 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">How It Works</p>
        <h2 class="text-3xl font-black tracking-tight sm:text-5xl">Simple for teams. Powerful for retention.</h2>
      </div>
      <div class="grid gap-5 md:grid-cols-2">
        <article v-for="(step, idx) in flowSteps" :key="step.title" class="hover-lift overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.04]">
          <img :src="step.image" :alt="step.title" class="h-48 w-full object-cover sm:h-56">
          <div class="space-y-3 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Step {{ idx + 1 }}</p>
            <h3 class="text-2xl font-black">{{ step.title }}</h3>
            <p class="text-sm leading-7 text-slate-300">{{ step.copy }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <AppCard wrapper-class="overflow-hidden border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/80 p-0">
        <div class="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div class="space-y-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-200">Reward Psychology</p>
            <h2 class="text-3xl font-black tracking-tight sm:text-5xl">Progress that guests want to complete.</h2>
            <p class="max-w-xl text-sm leading-8 text-slate-300 sm:text-base">
              Flotory turns stamps into visible progress, milestones, and celebration moments that keep guests coming back.
            </p>
          </div>
          <div class="grid gap-3">
            <div class="hover-lift rounded-2xl bg-slate-950/70 p-4 ring-1 ring-white/10">
              <p class="text-sm font-semibold text-slate-200">Progress toward next reward</p>
              <p class="mt-2 text-2xl font-black shimmer-stars">⭐⭐⭐☆☆</p>
              <p class="text-sm text-emerald-300">2 stamps until free cocktail</p>
            </div>
            <div class="hover-lift rounded-2xl bg-slate-950/70 p-4 ring-1 ring-white/10">
              <p class="text-sm font-semibold text-slate-200">Milestone unlocked</p>
              <p class="mt-2 text-lg font-black text-amber-300">Reward unlocked: House dessert</p>
              <p class="text-sm text-slate-300">A satisfying moment customers remember.</p>
            </div>
          </div>
        </div>
      </AppCard>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <div class="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <AppCard wrapper-class="border-white/10 bg-white/[0.04]">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Staff Experience</p>
          <h2 class="mt-4 text-3xl font-black tracking-tight">Built for busy staff.</h2>
          <p class="mt-3 text-sm leading-8 text-slate-300 sm:text-base">Open scanner. Scan QR. Done in seconds.</p>
          <div class="mt-6 space-y-3">
            <div class="hover-lift rounded-2xl bg-slate-900/70 p-4 ring-1 ring-white/10">
              <p class="text-sm font-semibold text-slate-200">1) Open scanner</p>
            </div>
            <div class="hover-lift rounded-2xl bg-slate-900/70 p-4 ring-1 ring-white/10">
              <p class="text-sm font-semibold text-slate-200">2) Scan customer QR</p>
            </div>
            <div class="hover-lift rounded-2xl bg-slate-900/70 p-4 ring-1 ring-white/10">
              <p class="text-sm font-semibold text-emerald-300">3) Stamp added instantly</p>
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
      <AppCard wrapper-class="border-white/10 bg-white/[0.04]">
        <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-200">Analytics</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight sm:text-5xl">See what keeps customers returning.</h2>
            <p class="mt-4 max-w-xl text-sm leading-8 text-slate-300 sm:text-base">
              Track repeat behavior, reward performance, and operational trends from one elegant dashboard.
            </p>
          </div>
          <div class="rounded-3xl bg-gradient-to-b from-slate-950/80 to-slate-900/70 p-4 ring-1 ring-white/10">
            <div class="mb-4 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
              <div class="flex items-end gap-2">
                <div class="h-8 w-2 rounded-full bg-indigo-300/80" />
                <div class="h-12 w-2 rounded-full bg-indigo-300/60" />
                <div class="h-10 w-2 rounded-full bg-indigo-300/70" />
                <div class="h-16 w-2 rounded-full bg-indigo-300/90" />
                <div class="h-11 w-2 rounded-full bg-indigo-300/70" />
                <div class="h-14 w-2 rounded-full bg-indigo-300/85" />
                <div class="h-9 w-2 rounded-full bg-indigo-300/60" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="metric in analyticsMetrics" :key="metric.label" class="hover-lift rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-300">{{ metric.label }}</p>
                <p class="mt-2 text-lg font-black text-white">{{ metric.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
      <div class="space-y-4 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Physical Venue Experience</p>
        <h2 class="text-3xl font-black tracking-tight sm:text-5xl">Turn every table into a loyalty entry point.</h2>
      </div>
      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <img class="hover-lift h-52 w-full rounded-3xl object-cover ring-1 ring-white/10" src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80" alt="QR table stand">
        <img class="hover-lift h-52 w-full rounded-3xl object-cover ring-1 ring-white/10" src="https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1000&q=80" alt="Counter display">
        <img class="hover-lift h-52 w-full rounded-3xl object-cover ring-1 ring-white/10" src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1000&q=80" alt="Hospitality poster and ambience">
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-6xl px-4 pb-14 sm:pb-16">
      <div class="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-6 sm:px-8">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Used by modern hospitality teams</p>
        <div class="mt-4 grid grid-cols-2 gap-3 text-sm font-semibold text-slate-300 sm:grid-cols-5">
          <div v-for="name in socialProof" :key="name" class="rounded-xl bg-white/[0.04] px-3 py-2 text-center ring-1 ring-white/10">
            {{ name }}
          </div>
        </div>
      </div>
    </section>

    <section class="reveal relative mx-auto max-w-5xl px-4 pb-20 sm:pb-24">
      <AppCard wrapper-class="border-white/10 bg-gradient-to-r from-slate-900/95 to-indigo-950/60 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Final CTA</p>
        <h2 class="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Launch your loyalty program in minutes.</h2>
        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <RouterLink to="/register?intent=owner">
            <AppButton size="lg" variant="secondary" class="btn-glow">Start free</AppButton>
          </RouterLink>
          <RouterLink to="/login?intent=owner">
            <AppButton size="lg" variant="ghost" class="text-white ring-1 ring-white/25 hover:bg-white/10 hover:text-white">Book demo</AppButton>
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
