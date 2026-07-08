<script setup lang="ts">
import { Check, FileText, FileUp, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import ListingChecklist from '@/components/loyalty/ListingChecklist.vue'
import OwnerOnboardingProgress from '@/components/onboarding/OwnerOnboardingProgress.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PhoneInput from '@/components/ui/PhoneInput.vue'
import VenueAddressInput from '@/components/ui/VenueAddressInput.vue'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { authFieldClass } from '@/lib/authForm'
import { normalizeVenueCategory, VENUE_CATEGORY_GROUPS, categoryLabel, type VenueCategory } from '@/lib/venueCategories'
import {
  clampOnboardingStep,
  isOnboardingStep,
  onboardingStepPath,
  ONBOARDING_STEP_LABELS,
  previousOnboardingStep,
  resolveOnboardingStep,
  type OnboardingStep,
  type OwnerOnboardingContext,
} from '@/lib/ownerOnboarding'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { listingStatusLabel } from '@/lib/venueListing'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

interface SetupFileRecord {
  id: number
  original_name: string
  path: string
  mime_type: string
  byte_size: number
  is_image: boolean
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const submitting = ref(false)
const error = ref('')

const context = ref<OwnerOnboardingContext | null>(null)
const venue = ref<Venue | null>(null)
const files = ref<SetupFileRecord[]>([])

const name = ref('')
const category = ref<VenueCategory>('cafe')

const selectChevronStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundPosition: 'right 0.75rem center',
}
const address = ref('')
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const googlePlaceId = ref<string | null>(null)
const phone = ref('')
const website = ref('')
const addressInput = ref<InstanceType<typeof VenueAddressInput> | null>(null)

const rewardTitle = ref('Free coffee')
const rewardDescription = ref('Enjoy a complimentary coffee after collecting enough stamps.')
const rewardStamps = ref(10)

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const dragDepth = ref(0)

const businessName = computed(() => context.value?.business_name?.trim() || '')

const currentStep = computed<OnboardingStep>(() => {
  const param = typeof route.params.step === 'string' ? route.params.step : undefined
  if (!param) {
    return 'welcome'
  }

  return isOnboardingStep(param) ? param : 'welcome'
})

const listing = computed(() => context.value?.listing ?? null)

const stepTitle = computed(() => ONBOARDING_STEP_LABELS[currentStep.value])

async function loadContext() {
  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap(true)
    context.value = await api<OwnerOnboardingContext>('/owner-onboarding')

    if (!context.value.active) {
      await router.replace('/dashboard')
      return
    }

    venue.value = context.value.venue
    syncFormFromVenue()

    if (venue.value) {
      await loadFiles()
    }

    const resolved = resolveOnboardingStep(venue.value, listing.value)
    const allowed = clampOnboardingStep(currentStep.value, venue.value, listing.value)
    if (currentStep.value === 'welcome' && resolved !== 'welcome') {
      await router.replace(onboardingStepPath(resolved))
    } else if (allowed !== currentStep.value) {
      await router.replace(onboardingStepPath(allowed))
    }
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load onboarding.')
  } finally {
    loading.value = false
  }
}

function syncFormFromVenue() {
  if (!venue.value) {
    if (businessName.value) {
      name.value = businessName.value
    }
    return
  }

  name.value = venue.value.name
  category.value = normalizeVenueCategory(venue.value.category)
  address.value = venue.value.address ?? ''
  latitude.value = venue.value.latitude ?? null
  longitude.value = venue.value.longitude ?? null
  googlePlaceId.value = venue.value.google_place_id ?? null
  phone.value = venue.value.phone ?? ''
  website.value = venue.value.website ?? ''
}

async function refreshContext() {
  context.value = await api<OwnerOnboardingContext>('/owner-onboarding')
  venue.value = context.value.venue
  syncFormFromVenue()
  await auth.refreshCapabilities()
  await workspace.bootstrap(true)
}

async function loadFiles() {
  if (!venue.value) {
    files.value = []
    return
  }

  const response = await api<{ files: SetupFileRecord[] }>(`/venues/${venue.value.id}/setup-files`)
  files.value = response.files
}

function goToStep(step: OnboardingStep) {
  void router.push(onboardingStepPath(step))
}

async function saveProfile(): Promise<boolean> {
  if (!name.value.trim()) {
    error.value = 'Venue name is required.'
    return false
  }

  saving.value = true
  error.value = ''

  try {
    if (venue.value) {
      const response = await api<{ venue: Venue }>(`/venues/${venue.value.id}`, {
        method: 'PUT',
        body: {
          name: name.value.trim(),
          category: category.value,
          address: address.value || undefined,
          latitude: latitude.value ?? undefined,
          longitude: longitude.value ?? undefined,
          google_place_id: googlePlaceId.value ?? undefined,
          phone: phone.value || undefined,
          website: website.value || undefined,
        },
      })
      venue.value = response.venue
    } else {
      const response = await api<{ venue: Venue }>('/venues', {
        method: 'POST',
        body: {
          name: name.value.trim(),
          category: category.value,
        },
      })
      venue.value = response.venue
    }

    await refreshContext()
    return true
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not save venue profile.'
    return false
  } finally {
    saving.value = false
  }
}

async function saveLocation(): Promise<boolean> {
  if (!venue.value) {
    error.value = 'Create your venue profile first.'
    return false
  }

  if (!addressInput.value?.validateSelection()) {
    error.value = 'Select an address from the Google suggestions list.'
    return false
  }

  saving.value = true
  error.value = ''

  try {
    const response = await api<{ venue: Venue }>(`/venues/${venue.value.id}`, {
      method: 'PUT',
      body: {
        name: name.value.trim(),
        category: category.value,
        address: address.value,
        latitude: latitude.value ?? undefined,
        longitude: longitude.value ?? undefined,
        google_place_id: googlePlaceId.value ?? undefined,
        phone: phone.value || undefined,
        website: website.value || undefined,
      },
    })
    venue.value = response.venue
    await refreshContext()
    return true
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not save location.'
    return false
  } finally {
    saving.value = false
  }
}

async function uploadSelectedFiles(selected: File[]) {
  if (!venue.value || !selected.length) {
    return
  }

  const images = selected.filter((file) => file.type.startsWith('image/'))
  if (!images.length) {
    error.value = 'Upload PNG, JPEG, WebP, or GIF images only — your logo and cover photo.'
    return
  }

  uploading.value = true
  error.value = ''

  let uploaded = 0

  for (const file of images) {
    try {
      const body = new FormData()
      body.append('file', file)

      const response = await api<{ file: SetupFileRecord }>(`/venues/${venue.value.id}/setup-files`, {
        method: 'POST',
        body,
      })

      files.value = [response.file, ...files.value.filter((item) => item.id !== response.file.id)]
      uploaded += 1
    } catch (exception) {
      error.value = apiErrorMessage(exception, `Could not upload ${file.name}.`)
      break
    }
  }

  if (uploaded > 0) {
    toast.success(uploaded === 1 ? 'File uploaded.' : `${uploaded} files uploaded.`)
    await refreshContext()
  }

  uploading.value = false
}

async function removeFile(file: SetupFileRecord) {
  if (!venue.value) {
    return
  }

  try {
    await api(`/venues/${venue.value.id}/setup-files/${file.id}`, { method: 'DELETE' })
    files.value = files.value.filter((item) => item.id !== file.id)
    await refreshContext()
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not remove file.')
  }
}

async function saveReward(): Promise<boolean> {
  if (!venue.value) {
    error.value = 'Create your venue profile first.'
    return false
  }

  if (!rewardTitle.value.trim()) {
    error.value = 'Reward title is required.'
    return false
  }

  saving.value = true
  error.value = ''

  try {
    const body = new FormData()
    body.append('title', rewardTitle.value.trim())
    body.append('required_stamps', String(rewardStamps.value))
    body.append('description', rewardDescription.value.trim())
    body.append('active', '1')

    await api(`/venues/${venue.value.id}/rewards`, { method: 'POST', body })
    await refreshContext()
    return true
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not create reward.'
    return false
  } finally {
    saving.value = false
  }
}

async function submitListing() {
  if (!venue.value || !listing.value?.can_submit) {
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await api(`/venues/${venue.value.id}/listing/submit`, { method: 'POST' })
    toast.success('Submitted for review. We will notify you once it is approved.')
    await refreshContext()
    await router.replace('/dashboard')
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not submit for review.')
  } finally {
    submitting.value = false
  }
}

async function continueFromStep() {
  error.value = ''

  if (currentStep.value === 'welcome') {
    goToStep(venue.value ? resolveOnboardingStep(venue.value, listing.value) : 'profile')
    return
  }

  if (currentStep.value === 'profile') {
    if (await saveProfile()) {
      goToStep('location')
    }
    return
  }

  if (currentStep.value === 'location') {
    if (await saveLocation()) {
      goToStep('files')
    }
    return
  }

  if (currentStep.value === 'files' && !venue.value) {
    goToStep('profile')
    return
  }

  if (currentStep.value === 'files') {
    if (!files.value.length) {
      error.value = 'Upload your logo and a cover photo so we can set up your listing.'
      return
    }
    goToStep('reward')
    return
  }

  if (currentStep.value === 'reward') {
    const hasReward = listing.value?.items.some((item) => item.key === 'rewards' && item.complete)
    if (!hasReward) {
      if (!(await saveReward())) {
        return
      }
    }
    goToStep('review')
    return
  }

  if (currentStep.value === 'review') {
    await submitListing()
  }
}

function goBack() {
  const previous = previousOnboardingStep(currentStep.value)
  if (previous) {
    goToStep(previous)
  }
}

function openFilePicker() {
  if (uploading.value) {
    return
  }
  fileInput.value?.click()
}

function onDragEnter(event: DragEvent) {
  event.preventDefault()
  if (uploading.value) {
    return
  }
  dragDepth.value += 1
  isDragging.value = true
}

function onDragLeave(event: DragEvent) {
  event.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) {
    isDragging.value = false
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragDepth.value = 0
  isDragging.value = false
  const selected = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  void uploadSelectedFiles(selected)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

onMounted(() => {
  void loadContext()
})

watch(
  () => route.params.step,
  () => {
    error.value = ''
  },
)
</script>

<template>
  <main class="relative min-h-screen overflow-x-hidden bg-marketing-page text-ink">
    <div class="pointer-events-none absolute inset-0 marketing-page-glow" />

    <div class="relative mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6 sm:px-6 sm:py-8">
      <header class="mb-6 flex items-center justify-between gap-4">
        <RouterLink to="/?public=1" aria-label="Flotory home">
          <FlotoryLogo size="lg" />
        </RouterLink>
        <AppBadge tone="amber">Owner setup</AppBadge>
      </header>

      <OwnerOnboardingProgress v-if="currentStep !== 'welcome'" class="mb-6" :current="currentStep" />

      <AppCard wrapper-class="flex-1 border-accent-border/25 bg-surface/95 backdrop-blur">
        <p v-if="loading" class="text-sm font-semibold text-ink-muted">Loading your setup…</p>

        <template v-else>
          <AppBadge tone="blue">{{ stepTitle }}</AppBadge>

          <template v-if="currentStep === 'welcome'">
            <h1 class="mt-4 text-3xl font-black tracking-tight text-ink sm:text-4xl">
              Welcome to Flotory
            </h1>
            <p class="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
              <template v-if="businessName">
                You&apos;re setting up <span class="font-semibold text-ink">{{ businessName }}</span>.
              </template>
              <template v-else>
                You&apos;re setting up your venue.
              </template>
              We&apos;ll walk you through profile, location, logo & cover, and your first reward — then submit for review.
            </p>
            <ul class="mt-6 space-y-3 text-sm text-ink-muted">
              <li class="flex items-start gap-3"><Check class="mt-0.5 size-4 shrink-0 text-success" /> Venue name and category</li>
              <li class="flex items-start gap-3"><Check class="mt-0.5 size-4 shrink-0 text-success" /> Address and contact details</li>
              <li class="flex items-start gap-3"><Check class="mt-0.5 size-4 shrink-0 text-success" /> Logo and cover photo</li>
              <li class="flex items-start gap-3"><Check class="mt-0.5 size-4 shrink-0 text-success" /> Your first stamp reward</li>
              <li class="flex items-start gap-3"><Check class="mt-0.5 size-4 shrink-0 text-success" /> Submit for Flotory approval</li>
            </ul>
          </template>

          <template v-else-if="currentStep === 'profile'">
            <h1 class="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">Your venue profile</h1>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">
              This is what customers will see in the app and on your public page.
            </p>
            <div class="mt-6 grid gap-4">
              <div>
                <label class="text-sm font-bold text-ink-muted" for="onboarding-name">Venue name<span class="text-danger" aria-hidden="true"> *</span></label>
                <input id="onboarding-name" v-model="name" required :class="authFieldClass" placeholder="Harbor Coffee">
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="text-sm font-bold text-ink-muted" for="onboarding-category">Category<span class="text-danger" aria-hidden="true"> *</span></label>
                  <select
                    id="onboarding-category"
                    v-model="category"
                    class="mt-2 h-12 w-full appearance-none rounded-2xl border border-border bg-surface bg-[length:14px_14px] bg-no-repeat py-0 pl-4 pr-10 text-sm font-semibold text-ink outline-none focus:border-ink-soft"
                    :style="selectChevronStyle"
                  >
                    <optgroup v-for="group in VENUE_CATEGORY_GROUPS" :key="group.label" :label="group.label">
                      <option v-for="id in group.ids" :key="id" :value="id">
                        {{ categoryLabel(id) }}
                      </option>
                    </optgroup>
                  </select>
                  <p v-if="category === 'other'" class="mt-2 text-xs leading-relaxed text-ink-muted">
                    Any business with repeat customers can use Flotory.
                  </p>
                </div>
                <div v-if="venue">
                  <p class="text-sm font-bold text-ink-muted">Public join link</p>
                  <p class="mt-2 break-all rounded-2xl border border-border bg-surface-muted px-3 py-2.5 text-xs font-semibold text-ink">
                    {{ buildVenueLandingUrl(venue.slug) }}
                  </p>
                  <p class="mt-2 text-xs leading-relaxed text-ink-muted">
                    Generated automatically from your venue name.
                  </p>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="currentStep === 'location'">
            <h1 class="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">Location & contact</h1>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">
              Pick your address from Google suggestions so guests can find you on the map.
            </p>
            <div class="mt-6 grid gap-4">
              <VenueAddressInput
                id="onboarding-address"
                ref="addressInput"
                v-model:address="address"
                v-model:latitude="latitude"
                v-model:longitude="longitude"
                v-model:google-place-id="googlePlaceId"
                required
                hint="Select a suggestion from the list."
              />
              <PhoneInput id="onboarding-phone" v-model="phone" label="Phone" />
              <div>
                <label class="text-sm font-bold text-ink-muted" for="onboarding-website">Website</label>
                <input id="onboarding-website" v-model="website" :class="authFieldClass" placeholder="https://example.com">
              </div>
            </div>
          </template>

          <template v-else-if="currentStep === 'files'">
            <h1 class="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">{{ ONBOARDING_STEP_LABELS.files }}</h1>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">
              Upload your venue logo and a cover photo for the app and public page. We&apos;ll crop and set these up for you — exact sizes are not required.
            </p>
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              @change="(event) => uploadSelectedFiles(Array.from((event.target as HTMLInputElement).files ?? []))"
            >
            <div
              class="mt-6 rounded-2xl border border-dashed px-4 py-6 transition"
              :class="cn(
                'border-border bg-surface-muted/60',
                isDragging && 'border-accent bg-accent/5',
              )"
              @dragenter="onDragEnter"
              @dragleave="onDragLeave"
              @dragover.prevent
              @drop.prevent="onDrop"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm font-semibold text-ink">Your uploads</p>
                <AppButton variant="secondary" size="sm" :disabled="uploading" @click="openFilePicker">
                  <FileUp class="size-4" />
                  {{ uploading ? 'Uploading…' : 'Upload images' }}
                </AppButton>
              </div>
              <ul v-if="files.length" class="mt-4 space-y-2">
                <li
                  v-for="file in files"
                  :key="file.id"
                  class="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <div class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-muted border border-border">
                      <img v-if="file.is_image" :src="file.path" :alt="file.original_name" class="size-full object-cover">
                      <FileText v-else class="size-4 text-ink-muted" />
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-ink">{{ file.original_name }}</p>
                      <p class="text-xs font-medium text-ink-muted">{{ formatSize(file.byte_size) }}</p>
                    </div>
                  </div>
                  <AppButton variant="ghost" size="sm" @click="removeFile(file)">
                    <Trash2 class="size-4" />
                  </AppButton>
                </li>
              </ul>
              <div v-else class="py-6 text-center">
                <button
                  type="button"
                  class="mx-auto grid size-14 place-items-center rounded-full border border-border bg-surface text-ink shadow-sm transition hover:border-accent/40 hover:bg-surface-muted"
                  @click="openFilePicker"
                >
                  <Plus class="size-6" />
                </button>
                <p class="mt-4 text-sm font-medium text-ink-muted">
                  {{ isDragging ? 'Drop images to upload' : 'Upload your logo and cover photo — drag and drop or click +.' }}
                </p>
              </div>
            </div>
          </template>

          <template v-else-if="currentStep === 'reward'">
            <h1 class="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">Your first reward</h1>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">
              Guests collect stamps on each visit. Set the reward they unlock when they reach the target.
            </p>
            <div class="mt-6 grid gap-4">
              <div>
                <label class="text-sm font-bold text-ink-muted" for="onboarding-reward-title">Reward title</label>
                <input id="onboarding-reward-title" v-model="rewardTitle" required :class="authFieldClass">
              </div>
              <div>
                <label class="text-sm font-bold text-ink-muted" for="onboarding-reward-stamps">Stamps required</label>
                <input
                  id="onboarding-reward-stamps"
                  v-model.number="rewardStamps"
                  type="number"
                  min="1"
                  max="100"
                  required
                  :class="authFieldClass"
                >
              </div>
              <div>
                <label class="text-sm font-bold text-ink-muted" for="onboarding-reward-description">Description</label>
                <textarea
                  id="onboarding-reward-description"
                  v-model="rewardDescription"
                  rows="4"
                  class="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:border-ink-soft"
                />
              </div>
            </div>
          </template>

          <template v-else-if="currentStep === 'review'">
            <h1 class="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">Review & submit</h1>
            <p class="mt-2 text-sm leading-relaxed text-ink-muted">
              Check everything below, then submit for Flotory review. Customers will see your venue after approval — usually within 1–3 business days.
            </p>
            <div v-if="venue && listing" class="mt-6 space-y-4">
              <div class="rounded-2xl border border-border/80 bg-surface-muted/60 p-4">
                <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">Venue</p>
                <p class="mt-1 text-lg font-black text-ink">{{ venue.name }}</p>
                <p class="mt-1 text-sm text-ink-muted">{{ venue.address || 'No address saved' }}</p>
                <p class="mt-2 text-xs font-semibold text-ink-soft">
                  Status: {{ listingStatusLabel(listing.status) }}
                </p>
              </div>
              <ListingChecklist :items="listing.items" :venue-id="venue.id" variant="owner" />
            </div>
          </template>

          <p v-if="error" class="mt-5 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>

          <div class="mt-8 flex flex-wrap gap-3">
            <AppButton
              v-if="currentStep !== 'welcome'"
              variant="secondary"
              :disabled="saving || uploading || submitting"
              @click="goBack"
            >
              Back
            </AppButton>
            <AppButton
              :disabled="saving || uploading || submitting"
              size="lg"
              @click="continueFromStep"
            >
              {{
                saving || submitting
                  ? 'Saving…'
                  : currentStep === 'welcome'
                    ? 'Get started'
                    : currentStep === 'review'
                      ? (listing?.can_submit ? 'Submit for review' : 'Complete checklist first')
                      : 'Continue'
              }}
            </AppButton>
          </div>
        </template>
      </AppCard>

      <p class="mt-6 text-center text-xs text-ink-muted">
        Need help?
        <RouterLink to="/contact" class="font-semibold text-ink hover:underline">Contact us</RouterLink>
      </p>
    </div>
  </main>
</template>
