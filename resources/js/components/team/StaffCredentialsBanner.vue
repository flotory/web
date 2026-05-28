<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import type { CredentialsReveal } from '@/lib/team'

defineProps<{
  reveal: CredentialsReveal
  statusNote?: string
}>()

const emit = defineEmits<{
  dismiss: []
  copy: []
}>()
</script>

<template>
  <div
    class="overflow-hidden rounded-[2rem] border-2 border-amber-400 bg-gradient-to-br from-amber-100 via-amber-50 to-white p-6 shadow-[0_24px_60px_-20px_rgba(245,158,11,0.55)] ring-4 ring-amber-300/50"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.2em] text-amber-800">Share with staff now</p>
        <h2 class="mt-2 text-2xl font-black text-slate-950">{{ reveal.member.user.name }}</h2>
        <p class="mt-1 text-sm font-semibold text-amber-900">This password is shown once. Send it before they try to log in.</p>
      </div>
      <button type="button" class="rounded-full px-3 py-1 text-sm font-black text-amber-900/70 transition hover:bg-amber-200/60" @click="emit('dismiss')">
        Dismiss
      </button>
    </div>

    <div class="mt-5 grid gap-4 sm:grid-cols-2">
      <div class="rounded-2xl bg-white/90 p-4 ring-2 ring-amber-300/80">
        <p class="text-xs font-black uppercase tracking-wide text-slate-500">Temporary password</p>
        <p class="mt-2 break-all font-mono text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {{ reveal.temporaryPassword }}
        </p>
      </div>
      <div class="space-y-3 rounded-2xl bg-white/70 p-4 ring-1 ring-amber-200">
        <div>
          <p class="text-xs font-black uppercase tracking-wide text-slate-500">Email</p>
          <p class="mt-1 text-sm font-bold text-slate-950">{{ reveal.member.user.email }}</p>
        </div>
        <div>
          <p class="text-xs font-black uppercase tracking-wide text-slate-500">Login link</p>
          <p class="mt-1 break-all text-sm font-semibold text-slate-700">{{ reveal.loginUrl }}</p>
        </div>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap gap-2">
      <AppButton class="bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600" @click="emit('copy')">
        Copy everything for staff
      </AppButton>
      <AppButton variant="secondary" @click="emit('dismiss')">Done sharing</AppButton>
    </div>

    <p v-if="statusNote" class="mt-3 text-sm font-bold text-amber-900">{{ statusNote }}</p>
  </div>
</template>
