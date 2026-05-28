<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api, ApiError } from '@/lib/api'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Reward, Venue } from '@/types'

type OnboardingStep = 1 | 2 | 3 | 4 | 5
type VenueCategory = 'cafe' | 'bar' | 'restaurant' | 'bakery'

const categories: Array<{ id: VenueCategory; label: string; emoji: string }> = [
  { id: 'cafe', label: 'Cafe', emoji: '☕' },
  { id: 'bar', label: 'Bar', emoji: '🍸' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { id: 'bakery', label: 'Bakery', emoji: '🥐' },
]

const rewardPresets = [
  { id: 'coffee', title: 'Free coffee after 5 visits', required_stamps: 5, description: 'A free signature coffee for regulars.' },
  { id: 'discount', title: '20% OFF after 10 visits', required_stamps: 10, description: 'A loyalty discount to keep guests returning.' },
  { id: 'dessert', title: 'Free dessert after 15 visits', required_stamps: 15, description: 'Celebrate regulars with a free sweet reward.' },
] as const

const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()

const step = ref<OnboardingStep>(1)
const loading = ref(false)
const logoUploading = ref(false)
const error = ref('')
const success = ref('')

const venue = ref<Venue | null>(null)
const venueName = ref('My Venue')
const venueSlug = ref('')
const category = ref<VenueCategory | null>(null)
const logoInput = ref<HTMLInputElement | null>(null)
const selectedRewards = ref<string[]>(rewardPresets.map((preset) => preset.id))

const completionPercent = computed(() => Math.round((step.value / 5) * 100))
const landingUrl = computed(() => (venue.value ? buildVenueLandingUrl(venue.value.slug) : ''))

function setStep(next: OnboardingStep) {
  step.value = next
  error.value = ''
  success.value = ''
}

async function createVenueAndContinue() {
  if (!venueName.value.trim()) {
    error.value = 'Venue name is required.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await api<{ venue: Venue }>('/venues', {
      method: 'POST',
      body: {
        name: venueName.value.trim(),
        slug: venueSlug.value.trim() || undefined,
      },
    })
    venue.value = response.venue
    await auth.fetchUser()
    await workspace.bootstrap(true)
    success.value = 'Venue created. Next, choose your category.'
    setStep(2)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Unable to create venue.'
  } finally {
    loading.value = false
  }
}

function saveCategoryAndContinue() {
  if (!category.value) {
    error.value = 'Choose one category to continue.'
    return
  }

  setStep(3)
}

function openLogoPicker() {
  logoInput.value?.click()
}

async function uploadLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file || !venue.value) return

  logoUploading.value = true
  error.value = ''

  try {
    const body = new FormData()
    body.append('logo', file)
    const response = await api<{ venue: Venue }>(`/venues/${venue.value.id}/logo`, {
      method: 'POST',
      body,
    })
    venue.value = response.venue
    success.value = 'Logo uploaded.'
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not upload logo.'
  } finally {
    logoUploading.value = false
  }
}

async function createRewardsAndContinue() {
  if (!venue.value) {
    error.value = 'Venue is missing. Please restart onboarding.'
    return
  }

  if (!selectedRewards.value.length) {
    error.value = 'Select at least one starter reward.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const chosen = rewardPresets.filter((preset) => selectedRewards.value.includes(preset.id))
    for (const reward of chosen) {
      const body = new FormData()
      body.append('title', reward.title)
      body.append('required_stamps', String(reward.required_stamps))
      body.append('description', reward.description)
      body.append('active', '1')
      await api<{ reward: Reward }>(`/venues/${venue.value.id}/rewards`, {
        method: 'POST',
        body,
      })
    }
    setStep(5)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not create starter rewards.'
  } finally {
    loading.value = false
  }
}

function toggleReward(id: string) {
  if (selectedRewards.value.includes(id)) {
    selectedRewards.value = selectedRewards.value.filter((item) => item !== id)
    return
  }
  selectedRewards.value = [...selectedRewards.value, id]
}

async function openDashboard() {
  await workspace.bootstrap(true)
  await router.push('/dashboard?onboarding=completed')
}
</script>

<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_58%)] px-4 py-8 text-slate-100 sm:py-12">
    <section class="mx-auto w-full max-w-2xl">
      <AppCard wrapper-class="w-full rounded-3xl border border-white/10 bg-white/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-7">
        <div class="mb-5 flex items-center justify-between gap-3">
          <div>
            <div class="mb-3">
              <FlotoryLogo />
            </div>
            <AppBadge tone="blue">Owner onboarding</AppBadge>
            <h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Launch your loyalty system</h1>
          </div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Step {{ step }} / 5</p>
        </div>

        <div class="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full bg-slate-900 transition-all duration-300" :style="{ width: `${completionPercent}%` }" />
        </div>

        <p v-if="error" class="mb-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>
        <p v-if="success" class="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{{ success }}</p>

        <div v-if="step === 1" class="space-y-4">
          <h2 class="text-2xl font-black text-slate-950">What’s your venue called?</h2>
          <p class="text-sm text-slate-500">This creates your workspace for rewards, scanner, and analytics.</p>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-name">Venue name</label>
            <input id="venue-name" v-model="venueName" required class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white">
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-slug">Slug (optional)</label>
            <input id="venue-slug" v-model="venueSlug" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white" placeholder="my-venue">
          </div>
          <AppButton class="w-full" size="lg" :disabled="loading" @click="createVenueAndContinue">
            {{ loading ? 'Creating venue...' : 'Continue' }}
          </AppButton>
        </div>

        <div v-else-if="step === 2" class="space-y-4">
          <h2 class="text-2xl font-black text-slate-950">Choose your venue category</h2>
          <p class="text-sm text-slate-500">Helps tailor onboarding messaging. You can change this later.</p>
          <div class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="item in categories"
              :key="item.id"
              type="button"
              class="rounded-2xl border p-4 text-left transition"
              :class="category === item.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'"
              @click="category = item.id"
            >
              <p class="text-lg">{{ item.emoji }}</p>
              <p class="mt-2 font-bold">{{ item.label }}</p>
            </button>
          </div>
          <div class="flex gap-2">
            <AppButton variant="ghost" class="w-full" @click="setStep(1)">Back</AppButton>
            <AppButton class="w-full" @click="saveCategoryAndContinue">Continue</AppButton>
          </div>
        </div>

        <div v-else-if="step === 3" class="space-y-4">
          <h2 class="text-2xl font-black text-slate-950">Upload venue image or logo</h2>
          <p class="text-sm text-slate-500">Optional for MVP. Adds trust to your customer landing page.</p>
          <div class="grid place-items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <div class="grid size-24 place-items-center overflow-hidden rounded-2xl bg-white text-3xl font-black text-slate-400 ring-1 ring-slate-200">
              <img v-if="venue?.logo" :src="venue.logo" alt="" class="size-full object-cover">
              <span v-else>{{ venue?.name?.slice(0, 1) ?? 'V' }}</span>
            </div>
            <input ref="logoInput" class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" @change="uploadLogo">
            <AppButton class="mt-4" variant="secondary" :disabled="logoUploading" @click="openLogoPicker">
              {{ logoUploading ? 'Uploading...' : (venue?.logo ? 'Replace logo' : 'Upload logo') }}
            </AppButton>
          </div>
          <div class="flex gap-2">
            <AppButton variant="ghost" class="w-full" @click="setStep(2)">Back</AppButton>
            <AppButton class="w-full" @click="setStep(4)">Continue</AppButton>
          </div>
        </div>

        <div v-else-if="step === 4" class="space-y-4">
          <h2 class="text-2xl font-black text-slate-950">Create your first rewards</h2>
          <p class="text-sm text-slate-500">Pick starter milestones to make the first customer experience rewarding.</p>
          <div class="space-y-3">
            <button
              v-for="preset in rewardPresets"
              :key="preset.id"
              type="button"
              class="w-full rounded-2xl border p-4 text-left transition"
              :class="selectedRewards.includes(preset.id) ? 'border-emerald-300 bg-emerald-50 text-slate-900' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'"
              @click="toggleReward(preset.id)"
            >
              <p class="font-bold">{{ preset.title }}</p>
              <p class="mt-1 text-xs">{{ preset.description }}</p>
            </button>
          </div>
          <div class="flex gap-2">
            <AppButton variant="ghost" class="w-full" @click="setStep(3)">Back</AppButton>
            <AppButton class="w-full" :disabled="loading" @click="createRewardsAndContinue">
              {{ loading ? 'Saving rewards...' : 'Continue' }}
            </AppButton>
          </div>
        </div>

        <div v-else-if="step === 5" class="space-y-4">
          <h2 class="text-2xl font-black text-slate-950">Your venue is live. Print your QR.</h2>
          <p class="text-sm text-slate-500">Place this on tables and counters so customers can join instantly.</p>
          <div class="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div class="mx-auto rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <QrcodeVue v-if="landingUrl" :value="landingUrl" :size="170" level="M" render-as="canvas" :margin="2" />
            </div>
            <div class="text-center sm:text-left">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Venue link</p>
              <p class="mt-2 break-all text-sm font-semibold text-slate-900">{{ landingUrl }}</p>
              <p class="mt-2 text-sm text-slate-600">Print and place in your venue.</p>
            </div>
          </div>
          <div class="flex gap-2">
            <AppButton variant="ghost" class="w-full" @click="setStep(4)">Back</AppButton>
            <AppButton class="w-full" @click="openDashboard">Open dashboard</AppButton>
          </div>
        </div>
      </AppCard>
    </section>
  </main>
</template>
