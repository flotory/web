<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api, ApiError } from '@/lib/api'
import {
  categoryLabel,
  normalizeVenueCategory,
  rewardPresetsForCategory,
  type VenueCategory,
} from '@/lib/defaultImages'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { clearOwnerOnboardingIntent, markOwnerOnboardingIntent } from '@/lib/ownerIntent'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Reward, Venue } from '@/types'

type OnboardingStep = 1 | 2 | 3 | 4
const categories: Array<{ id: VenueCategory; label: string; emoji: string }> = [
  { id: 'cafe', label: 'Cafe', emoji: '☕' },
  { id: 'bar', label: 'Bar', emoji: '🍸' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { id: 'bakery', label: 'Bakery', emoji: '🥐' },
]

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const ONBOARDING_DRAFT_VENUE_KEY = 'owner_onboarding_draft_venue_id'
const ONBOARDING_DRAFT_STEP_KEY = 'owner_onboarding_draft_step'

const step = ref<OnboardingStep>(1)
const loading = ref(false)
const error = ref('')
const success = ref('')

const venue = ref<Venue | null>(null)
const venueName = ref('My Venue')
const venueSlug = ref('')
const category = ref<VenueCategory | null>(null)
const selectedRewards = ref<string[]>([])

const activeCategory = computed(() => normalizeVenueCategory(category.value ?? venue.value?.category))
const rewardPresets = computed(() => rewardPresetsForCategory(activeCategory.value))
const completionPercent = computed(() => Math.round((step.value / 4) * 100))
const landingUrl = computed(() => (venue.value ? buildVenueLandingUrl(venue.value.slug) : ''))

function mapDraftStep(saved: number): OnboardingStep {
  if (saved <= 2) {
    return saved as OnboardingStep
  }
  if (saved === 3) {
    return 3
  }
  if (saved >= 4) {
    return Math.min(4, saved - 1) as OnboardingStep
  }
  return 1
}

function syncRewardSelection() {
  selectedRewards.value = rewardPresets.value.map((preset) => preset.id)
}

function persistOnboardingDraft() {
  if (!venue.value) return

  sessionStorage.setItem(ONBOARDING_DRAFT_VENUE_KEY, String(venue.value.id))
  sessionStorage.setItem(ONBOARDING_DRAFT_STEP_KEY, String(step.value))
}

function clearOnboardingDraft() {
  sessionStorage.removeItem(ONBOARDING_DRAFT_VENUE_KEY)
  sessionStorage.removeItem(ONBOARDING_DRAFT_STEP_KEY)
}

function setStep(next: OnboardingStep) {
  step.value = next
  error.value = ''
  success.value = ''
  persistOnboardingDraft()
}

async function createVenueAndContinue() {
  if (venue.value) {
    setStep(2)
    return
  }

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
    persistOnboardingDraft()
    setStep(2)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Unable to create venue.'
  } finally {
    loading.value = false
  }
}

async function saveCategoryAndContinue() {
  if (!category.value) {
    error.value = 'Choose one category to continue.'
    return
  }

  if (!venue.value) {
    error.value = 'Create your venue first.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await api<{ venue: Venue }>(`/venues/${venue.value.id}`, {
      method: 'PUT',
      body: { name: venue.value.name, category: category.value },
    })
    venue.value = response.venue
    syncRewardSelection()
    persistOnboardingDraft()
    setStep(3)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not save category.'
  } finally {
    loading.value = false
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
    const chosen = rewardPresets.value.filter((preset) => selectedRewards.value.includes(preset.id))
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
    setStep(4)
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
  clearOnboardingDraft()
  clearOwnerOnboardingIntent()
  await workspace.bootstrap(true)
  await router.push('/dashboard?onboarding=completed')
}

async function leaveForCustomerExperience() {
  clearOnboardingDraft()
  clearOwnerOnboardingIntent()
  await router.push('/wallet')
}

async function logout() {
  clearOnboardingDraft()
  await auth.logout()
  await router.push('/')
}

onMounted(async () => {
  if (route.query.intent === 'owner') {
    markOwnerOnboardingIntent()
  }

  try {
    await workspace.bootstrap(true)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not load your account. Try refreshing the page.'
    return
  }

  const draftVenueId = Number(sessionStorage.getItem(ONBOARDING_DRAFT_VENUE_KEY) || 0)
  const draftStep = Number(sessionStorage.getItem(ONBOARDING_DRAFT_STEP_KEY) || 1)

  if (draftVenueId > 0) {
    const draftVenue = workspace.activeVenues.find((item) => item.id === draftVenueId) ?? null
    if (draftVenue) {
      venue.value = draftVenue
      venueName.value = draftVenue.name
      venueSlug.value = draftVenue.slug
      category.value = normalizeVenueCategory(draftVenue.category)
      syncRewardSelection()
      if (draftStep >= 1 && draftStep <= 5) {
        step.value = mapDraftStep(draftStep)
      }
      return
    }

    clearOnboardingDraft()
  }
})
</script>

<template>
  <main class="min-h-screen bg-auth-gradient px-4 py-8 text-primary-text sm:py-12">
    <section class="mx-auto w-full max-w-2xl">
      <AppCard wrapper-class="w-full rounded-3xl border border-white/10 bg-surface/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-7">
        <div class="mb-5 flex items-center justify-between gap-3">
          <div>
            <div class="mb-3">
              <FlotoryLogo />
            </div>
            <AppBadge tone="blue">Owner onboarding</AppBadge>
            <h1 class="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">Launch your loyalty system</h1>
          </div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Step {{ step }} / 4</p>
        </div>

        <div class="mb-6 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div class="h-full rounded-full bg-primary transition-all duration-300" :style="{ width: `${completionPercent}%` }" />
        </div>

        <p v-if="error" class="mb-4 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>
        <p v-if="success" class="mb-4 rounded-2xl bg-success-bg p-3 text-sm font-semibold text-success-text">{{ success }}</p>

        <div v-if="step === 1" class="space-y-4">
          <h2 class="text-2xl font-black text-ink">What’s your venue called?</h2>
          <p class="text-sm text-ink-muted">This creates your workspace for rewards, scanner, and analytics.</p>
          <div>
            <label class="text-sm font-bold text-ink-muted" for="venue-name">Venue name</label>
            <input id="venue-name" v-model="venueName" required class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft focus:bg-surface">
          </div>
          <div>
            <label class="text-sm font-bold text-ink-muted" for="venue-slug">Slug (optional)</label>
            <input id="venue-slug" v-model="venueSlug" class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft focus:bg-surface" placeholder="my-venue">
          </div>
          <AppButton class="w-full" size="lg" :disabled="loading" @click="createVenueAndContinue">
            {{ loading ? 'Creating venue...' : 'Continue' }}
          </AppButton>
        </div>

        <div v-else-if="step === 2" class="space-y-4">
          <h2 class="text-2xl font-black text-ink">Choose your venue category</h2>
          <p class="text-sm text-ink-muted">Helps tailor onboarding messaging. You can change this later.</p>
          <div class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="item in categories"
              :key="item.id"
              type="button"
              class="rounded-2xl border p-4 text-left transition"
              :class="category === item.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface-muted text-ink hover:bg-surface-muted'"
              @click="category = item.id"
            >
              <p class="text-lg">{{ item.emoji }}</p>
              <p class="mt-2 font-bold">{{ item.label }}</p>
            </button>
          </div>
          <div class="flex gap-2">
            <AppButton variant="ghost" class="w-full" @click="setStep(1)">Back</AppButton>
            <AppButton class="w-full" :disabled="loading" @click="saveCategoryAndContinue">
              {{ loading ? 'Saving...' : 'Continue' }}
            </AppButton>
          </div>
        </div>

        <div v-else-if="step === 3" class="space-y-4">
          <h2 class="text-2xl font-black text-ink">Create your first rewards</h2>
          <p class="text-sm text-ink-muted">Starter rewards tailored for {{ categoryLabel(activeCategory).toLowerCase() }}s.</p>
          <div class="space-y-3">
            <button
              v-for="preset in rewardPresets"
              :key="preset.id"
              type="button"
              class="flex w-full gap-3 rounded-2xl border p-3 text-left transition"
              :class="selectedRewards.includes(preset.id) ? 'border-success-border bg-success-bg text-ink' : 'border-border bg-surface-muted text-ink-muted hover:bg-surface-muted'"
              @click="toggleReward(preset.id)"
            >
              <img :src="preset.image" :alt="preset.title" class="size-16 shrink-0 rounded-xl object-cover ring-1 ring-border">
              <span>
                <p class="font-bold">{{ preset.title }}</p>
                <p class="mt-1 text-xs">{{ preset.description }}</p>
              </span>
            </button>
          </div>
          <div class="flex gap-2">
            <AppButton variant="ghost" class="w-full" @click="setStep(2)">Back</AppButton>
            <AppButton class="w-full" :disabled="loading" @click="createRewardsAndContinue">
              {{ loading ? 'Saving rewards...' : 'Continue' }}
            </AppButton>
          </div>
        </div>

        <div v-else-if="step === 4" class="space-y-4">
          <h2 class="text-2xl font-black text-ink">Your venue is live. Print your QR.</h2>
          <p class="text-sm text-ink-muted">Place this on tables and counters so customers can join instantly.</p>
          <div class="grid gap-4 rounded-3xl border border-border bg-surface-muted p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div class="mx-auto w-fit rounded-2xl bg-surface p-3 ring-1 ring-border [&_canvas]:block">
              <QrcodeVue v-if="landingUrl" :value="landingUrl" :size="170" level="M" render-as="canvas" :margin="2" />
            </div>
            <div class="text-center sm:text-left">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Venue link</p>
              <p class="mt-2 break-all text-sm font-semibold text-ink">{{ landingUrl }}</p>
              <p class="mt-2 text-sm text-ink-muted">Print and place in your venue.</p>
            </div>
          </div>
          <div class="flex gap-2">
            <AppButton variant="ghost" class="w-full" @click="setStep(3)">Back</AppButton>
            <AppButton class="w-full" @click="openDashboard">Open dashboard</AppButton>
          </div>
        </div>
      </AppCard>

      <div class="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-white/70">
        <button type="button" class="font-semibold text-white/90 underline-offset-2 hover:underline" @click="leaveForCustomerExperience">
          I&apos;m collecting stamps, not setting up a venue
        </button>
        <span class="hidden text-white/30 sm:inline">·</span>
        <button type="button" class="font-semibold text-white/90 underline-offset-2 hover:underline" @click="logout">
          Log out
        </button>
      </div>
    </section>
  </main>
</template>
