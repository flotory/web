<script setup lang="ts">
import { RouterLink } from 'vue-router'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
</script>

<template>
  <main class="min-h-screen overflow-hidden bg-slate-950 text-white">
    <section class="mx-auto grid min-h-screen max-w-6xl content-center gap-10 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <p class="mb-5 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-blue-100 ring-1 ring-white/10">
          Digital stamps for independent restaurants
        </p>
        <h1 class="max-w-3xl text-5xl font-black tracking-tight sm:text-6xl">
          Bring customers back without a heavy CRM.
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Simple loyalty cards, QR scanning, rewards, and retention analytics in a fast mobile-first SaaS platform.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <RouterLink to="/register">
            <AppButton size="lg" variant="secondary">Create account</AppButton>
          </RouterLink>
          <RouterLink to="/login">
            <AppButton size="lg" variant="ghost" class="text-white hover:bg-white/10 hover:text-white">Log in to demo</AppButton>
          </RouterLink>
        </div>
      </div>

      <AppCard wrapper-class="bg-white/95 p-4 text-slate-950 shadow-2xl shadow-blue-950/30">
        <div class="rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-slate-950 p-5 text-white">
          <p class="text-sm font-semibold text-blue-100">Demo Cafe</p>
          <h2 class="mt-10 text-3xl font-black">3 stamps collected</h2>
          <p class="mt-2 text-blue-100">2 more visits for 50% off burger</p>
          <div class="mt-6 flex gap-2 text-2xl">
            <span>★</span><span>★</span><span>★</span><span class="text-white/25">★</span><span class="text-white/25">★</span>
          </div>
        </div>
        <div class="grid gap-3 p-2 pt-4">
          <div class="rounded-2xl bg-slate-100 p-4">
            <p class="text-sm font-bold text-slate-500">Staff flow</p>
            <p class="mt-1 text-lg font-black">Open scanner → scan → success</p>
          </div>
          <div class="rounded-2xl bg-slate-100 p-4">
            <p class="text-sm font-bold text-slate-500">MVP analytics</p>
            <p class="mt-1 text-lg font-black">Customers, visits, repeats, redemptions</p>
          </div>
        </div>
      </AppCard>
    </section>
  </main>
</template>
