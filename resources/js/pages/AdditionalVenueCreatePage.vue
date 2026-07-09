<script setup lang="ts">
import { FileText, FileUp, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ListingChecklist from '@/components/loyalty/ListingChecklist.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import PhoneInput from '@/components/ui/PhoneInput.vue'
import VenueAddressInput from '@/components/ui/VenueAddressInput.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { authFieldClass } from '@/lib/authForm'
import type { OwnerOnboardingDraft } from '@/lib/ownerOnboarding'
import { listingStatusLabel } from '@/lib/venueListing'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import type { VenueListingSnapshot } from '@/lib/venueListing'
import { useWorkspaceStore } from '@/stores/workspace'

import {
  additionalVenueCreateFreshPath,
  additionalVenueCreateStepPath,
  ADDITIONAL_VENUE_CREATE_STEPS,
  type AdditionalVenueCreateStep,
  isAdditionalVenueCreateStep,
} from '@/lib/additionalVenueCreate'

const CREATE_STEPS = ADDITIONAL_VENUE_CREATE_STEPS
type CreateStep = AdditionalVenueCreateStep

const STEP_LABELS: Record<CreateStep, string> = {
  details: 'Venue profile',
  files: 'Files',
  reward: 'First reward',
  review: 'Submit',
}

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
const workspace = useWorkspaceStore()

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const submitting = ref(false)
const error = ref('')
const restarting = ref(false)

const draft = ref<OwnerOnboardingDraft | null>(null)
const listing = ref<VenueListingSnapshot | null>(null)
const files = ref<SetupFileRecord[]>([])

const name = ref('')
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

const currentStep = computed<CreateStep>(() => {
  const param = typeof route.params.step === 'string' ? route.params.step : 'details'
  return isAdditionalVenueCreateStep(param) ? param : 'details'
})

const stepIndex = computed(() => CREATE_STEPS.indexOf(currentStep.value))
const progressPercent = computed(() => Math.round(((stepIndex.value + 1) / CREATE_STEPS.length) * 100))

const headerDescription = computed(() => {
  const venueName = name.value.trim() || draft.value?.name?.trim()
  return venueName ? `Setting up ${venueName}` : 'Add your venue details, branding, and first reward.'
})

function stepPath(step: CreateStep): string {
  return additionalVenueCreateStepPath(step)
}

function syncFormFromDraft() {
  if (!draft.value) {
    return
  }

  name.value = draft.value.name ?? ''
  address.value = draft.value.address ?? ''
  latitude.value = draft.value.latitude ?? null
  longitude.value = draft.value.longitude ?? null
  googlePlaceId.value = draft.value.google_place_id ?? null
  phone.value = draft.value.phone ?? ''
  website.value = draft.value.website ?? ''
  rewardTitle.value = draft.value.reward?.title || rewardTitle.value
  rewardDescription.value = draft.value.reward?.description || rewardDescription.value
  rewardStamps.value = draft.value.reward?.required_stamps || rewardStamps.value
}

async function loadDraft(): Promise<boolean> {
  try {
    const response = await api<{
      draft: OwnerOnboardingDraft
      listing: VenueListingSnapshot
      files: SetupFileRecord[]
    }>('/owner-onboarding/additional-venue')

    draft.value = response.draft
    listing.value = response.listing
    files.value = response.files
    syncFormFromDraft()
    return true
  } catch (exception) {
    if (exception instanceof ApiError && exception.status === 404) {
      return false
    }

    throw exception
  }
}

async function loadPage() {
  loading.value = true
  error.value = ''

  try {
    if (route.query.fresh === '1') {
      try {
        await api('/owner-onboarding/draft', { method: 'DELETE' })
      } catch {
        // Best effort.
      }
      restarting.value = true
      draft.value = null
      listing.value = null
      files.value = []
      name.value = ''
      address.value = ''
      latitude.value = null
      longitude.value = null
      googlePlaceId.value = null
      phone.value = ''
      website.value = ''
      await router.replace({ path: additionalVenueCreateStepPath('details'), query: {} })
    }

    const hasDraft = await loadDraft()

    if (!hasDraft && currentStep.value !== 'details') {
      await router.replace(stepPath('details'))
      return
    }

    if (currentStep.value === 'review' && !listing.value?.can_submit) {
      await router.replace(stepPath(resolveIncompleteStep()))
    }
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load venue setup.')
  } finally {
    loading.value = false
  }
}

function resolveIncompleteStep(): CreateStep {
  if (!listing.value) {
    return 'details'
  }

  const complete = (key: string) => listing.value?.items.find((item) => item.key === key)?.complete === true

  if (!name.value.trim() || !complete('address')) {
    return 'details'
  }

  if (!complete('setup_files')) {
    return 'files'
  }

  if (!complete('rewards')) {
    return 'reward'
  }

  return 'review'
}

async function saveDraft(body: Record<string, unknown>): Promise<boolean> {
  saving.value = true
  error.value = ''

  try {
    const response = await api<{ draft: OwnerOnboardingDraft; listing: VenueListingSnapshot }>(
      '/owner-onboarding/draft',
      { method: 'PUT', body: { purpose: 'additional_venue', ...body } },
    )
    draft.value = response.draft
    listing.value = response.listing
    syncFormFromDraft()
    return true
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not save your progress.'
    return false
  } finally {
    saving.value = false
  }
}

async function saveDetails(): Promise<boolean> {
  if (!addressInput.value?.validateSelection()) {
    error.value = 'Select an address from the Google suggestions list.'
    return false
  }

  const saved = await saveDraft({
    restart: restarting.value,
    name: name.value.trim(),
    category: 'cafe',
    address: address.value,
    latitude: latitude.value ?? undefined,
    longitude: longitude.value ?? undefined,
    google_place_id: googlePlaceId.value ?? undefined,
    phone: phone.value || undefined,
    website: website.value || undefined,
  })

  if (saved) {
    restarting.value = false
  }

  return saved
}

async function uploadSelectedFiles(selected: File[]) {
  if (!selected.length) {
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

      const response = await api<{ file: SetupFileRecord; listing: VenueListingSnapshot }>(
        '/owner-onboarding/draft/files',
        { method: 'POST', body },
      )

      files.value = [response.file, ...files.value.filter((item) => item.id !== response.file.id)]
      listing.value = response.listing
      uploaded += 1
    } catch (exception) {
      error.value = apiErrorMessage(exception, `Could not upload ${file.name}.`)
      break
    }
  }

  if (uploaded > 0) {
    toast.success(uploaded === 1 ? 'File uploaded.' : `${uploaded} files uploaded.`)
  }

  uploading.value = false
}

async function removeFile(file: SetupFileRecord) {
  try {
    const response = await api<{ listing: VenueListingSnapshot }>(
      `/owner-onboarding/draft/files/${file.id}`,
      { method: 'DELETE' },
    )
    files.value = files.value.filter((item) => item.id !== file.id)
    listing.value = response.listing
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not remove file.')
  }
}

async function saveReward(): Promise<boolean> {
  return saveDraft({
    reward: {
      title: rewardTitle.value.trim(),
      description: rewardDescription.value.trim(),
      required_stamps: rewardStamps.value,
    },
  })
}

async function submitDetailsStep() {
  error.value = ''

  if (await saveDetails()) {
    await router.push(stepPath('files'))
  }
}

async function submitRewardStep() {
  error.value = ''

  const hasReward = listing.value?.items.some((item) => item.key === 'rewards' && item.complete)
  if (!hasReward && !(await saveReward())) {
    return
  }

  await router.push(stepPath('review'))
}

async function submitListing() {
  if (!listing.value?.can_submit) {
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const response = await api<{ venue: { id: number } }>('/owner-onboarding/submit', { method: 'POST' })
    toast.success('Submitted for review. We will notify you once it is approved.')
    workspace.setFilter(response.venue.id)
    await workspace.bootstrap(true)
    await router.replace('/my-venues')
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not submit for review.')
  } finally {
    submitting.value = false
  }
}

async function discardAndExit() {
  try {
    await api('/owner-onboarding/draft', { method: 'DELETE' })
  } catch {
    // Best effort.
  }

  await router.push('/my-venues')
}

async function continueFromStep() {
  error.value = ''

  if (currentStep.value === 'files') {
    if (!files.value.length) {
      error.value = 'Upload your logo and a cover photo so we can set up your listing.'
      return
    }
    await router.push(stepPath('reward'))
    return
  }

  if (currentStep.value === 'review') {
    await submitListing()
  }
}

function goBack() {
  if (currentStep.value === 'files') {
    void router.push(stepPath('details'))
    return
  }

  if (currentStep.value === 'reward') {
    void router.push(stepPath('files'))
    return
  }

  if (currentStep.value === 'review') {
    void router.push(stepPath('reward'))
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
  void loadPage()
})

watch(
  () => route.params.step,
  () => {
    error.value = ''
  },
)
</script>

<template>
  <AppShell>
    <PageHeader
      title="New venue"
      badge="Create"
      :description="headerDescription"
    >
      <template #actions>
        <AppButton variant="ghost" size="sm" @click="discardAndExit">Cancel</AppButton>
      </template>
    </PageHeader>

    <AppCard wrapper-class="mb-5 border-border/80 bg-surface/95 backdrop-blur">
      <div class="mb-6 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-ink-soft">
        <span>Step {{ stepIndex + 1 }} of {{ CREATE_STEPS.length }}</span>
        <span>{{ progressPercent }}%</span>
      </div>
      <div class="mb-6 grid grid-cols-4 gap-2">
        <div
          v-for="(step, index) in CREATE_STEPS"
          :key="step"
          class="h-2 rounded-full"
          :class="index <= stepIndex ? 'bg-accent' : 'bg-surface-muted'"
        />
      </div>

      <p v-if="loading" class="text-sm font-semibold text-ink-muted">Loading setup…</p>

      <template v-else>
        <AppBadge tone="blue">{{ STEP_LABELS[currentStep] }}</AppBadge>

        <form v-if="currentStep === 'details'" id="create-venue-details-form" @submit.prevent="submitDetailsStep">
          <h1 class="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">Venue profile</h1>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">
            Profile details customers and staff will recognize.
          </p>
          <div class="mt-6 grid gap-4">
            <div>
              <label class="text-sm font-bold text-ink-muted" for="create-venue-name">Venue name<span class="text-danger" aria-hidden="true"> *</span></label>
              <input
                id="create-venue-name"
                v-model="name"
                required
                :class="authFieldClass"
                placeholder="Harbor Coffee"
              >
            </div>
            <VenueAddressInput
              id="create-venue-address"
              ref="addressInput"
              v-model:address="address"
              v-model:latitude="latitude"
              v-model:longitude="longitude"
              v-model:google-place-id="googlePlaceId"
              label="Address"
              required
              hint="Pick a Google suggestion so we can save map coordinates."
            />
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="text-sm font-bold text-ink-muted" for="create-venue-website">Website</label>
                <input
                  id="create-venue-website"
                  v-model="website"
                  :class="authFieldClass"
                  placeholder="https://example.com"
                >
              </div>
              <PhoneInput id="create-venue-phone" v-model="phone" label="Phone" />
            </div>
          </div>
        </form>

        <template v-else-if="currentStep === 'files'">
          <h1 class="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">Logo & cover</h1>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">
            Upload your venue logo and a cover photo for the app and public page.
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
                  <div class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-muted">
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
          </div>
        </template>

        <form v-else-if="currentStep === 'reward'" id="create-venue-reward-form" @submit.prevent="submitRewardStep">
          <h1 class="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">Your first reward</h1>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">
            Guests collect stamps on each visit. Set the reward they unlock when they reach the target.
          </p>
          <div class="mt-6 grid gap-4">
            <div>
              <label class="text-sm font-bold text-ink-muted" for="create-reward-title">Reward title</label>
              <input id="create-reward-title" v-model="rewardTitle" required :class="authFieldClass">
            </div>
            <div>
              <label class="text-sm font-bold text-ink-muted" for="create-reward-stamps">Stamps required</label>
              <input
                id="create-reward-stamps"
                v-model.number="rewardStamps"
                type="number"
                min="1"
                max="100"
                required
                :class="authFieldClass"
              >
            </div>
            <div>
              <label class="text-sm font-bold text-ink-muted" for="create-reward-description">Description</label>
              <textarea
                id="create-reward-description"
                v-model="rewardDescription"
                rows="4"
                class="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:border-ink-soft"
              />
            </div>
          </div>
        </form>

        <template v-else-if="currentStep === 'review'">
          <h1 class="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">Review & submit</h1>
          <p class="mt-2 text-sm leading-relaxed text-ink-muted">
            Check everything below, then submit for Flotory review.
          </p>
          <div v-if="listing && draft" class="mt-6 space-y-4">
            <div class="rounded-2xl border border-border/80 bg-surface-muted/60 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">Venue</p>
              <p class="mt-1 text-lg font-black text-ink">{{ draft.name }}</p>
              <p class="mt-1 text-sm text-ink-muted">{{ draft.address || 'No address saved' }}</p>
              <p class="mt-2 text-xs font-semibold text-ink-soft">
                Status: {{ listingStatusLabel(listing.status) }}
              </p>
            </div>
            <ListingChecklist :items="listing.items" variant="owner" />
          </div>
        </template>

        <p v-if="error" class="mt-5 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>

        <div class="mt-8 flex flex-wrap gap-3">
          <AppButton
            v-if="currentStep !== 'details'"
            variant="secondary"
            :disabled="saving || uploading || submitting"
            @click="goBack"
          >
            Back
          </AppButton>
          <AppButton
            v-if="currentStep === 'details'"
            type="submit"
            form="create-venue-details-form"
            :disabled="saving || uploading || submitting"
            size="lg"
          >
            {{ saving ? 'Saving…' : 'Continue' }}
          </AppButton>
          <AppButton
            v-else-if="currentStep === 'reward'"
            type="submit"
            form="create-venue-reward-form"
            :disabled="saving || uploading || submitting"
            size="lg"
          >
            {{ saving ? 'Saving…' : 'Continue' }}
          </AppButton>
          <AppButton
            v-else
            type="button"
            :disabled="saving || uploading || submitting"
            size="lg"
            @click="continueFromStep"
          >
            {{
              saving || submitting
                ? 'Saving…'
                : currentStep === 'review'
                  ? (listing?.can_submit ? 'Submit for review' : 'Complete checklist first')
                  : 'Continue'
            }}
          </AppButton>
        </div>
      </template>
    </AppCard>

    <p class="text-center text-xs text-ink-muted">
      Changed your mind?
      <button type="button" class="font-semibold text-ink hover:underline" @click="discardAndExit">Discard draft</button>
    </p>
  </AppShell>
</template>
