<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PhoneInput from '@/components/ui/PhoneInput.vue'
import VenueAddressInput from '@/components/ui/VenueAddressInput.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError, isVenueAccessDenied } from '@/lib/api'
import { VENUE_ACCESS_DENIED_MESSAGE } from '@/lib/venueWorkspace'
import { downloadVenueQrPng } from '@/lib/downloadVenueQrPng'
import { normalizeVenueCategory } from '@/lib/defaultImages'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { venueCoverUrl, venueLogoUrl } from '@/lib/venueMedia'
import type { Venue, VenueBranch, VenueCategory } from '@/types'

const route = useRoute()
const router = useRouter()

const venue = ref<Venue | null>(null)
const loading = ref(true)
const saveVenueAction = useAsyncAction()
const error = ref('')
const name = ref('')
const slug = ref('')
const address = ref('')
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const googlePlaceId = ref<string | null>(null)
const addressQuotaRemaining = ref<number | null>(null)
const addressInput = ref<InstanceType<typeof VenueAddressInput> | null>(null)
const phone = ref('')
const website = ref('')
const category = ref<VenueCategory>('cafe')

const branches = ref<VenueBranch[]>([])
const branchesLoading = ref(false)
const branchError = ref('')
const branchName = ref('')
const branchAddress = ref('')
const branchLatitude = ref<number | null>(null)
const branchLongitude = ref<number | null>(null)
const branchGooglePlaceId = ref<string | null>(null)
const branchAddressInput = ref<InstanceType<typeof VenueAddressInput> | null>(null)
const addBranchAction = useAsyncAction()
const deletingBranchId = ref<number | null>(null)

const categoryOptions: Array<{ id: VenueCategory; label: string }> = [
  { id: 'cafe', label: 'Cafe' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'bar', label: 'Bar' },
  { id: 'bakery', label: 'Bakery' },
]

const selectChevronStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundPosition: 'right 0.75rem center',
}

const venueId = computed(() => Number(route.params.id))
const slugLocked = computed(() => venue.value?.status === 'published')
const linkCopied = ref(false)

const publicSlug = computed(() => slug.value.trim() || venue.value?.slug || '')
const landingUrl = computed(() => (publicSlug.value ? buildVenueLandingUrl(publicSlug.value) : ''))

function hydrateForm(item: Venue) {
  venue.value = item
  name.value = item.name
  slug.value = item.slug
  address.value = item.address ?? ''
  latitude.value = item.latitude ?? null
  longitude.value = item.longitude ?? null
  googlePlaceId.value = item.google_place_id ?? null
  addressQuotaRemaining.value = item.address_quota?.remaining ?? null
  phone.value = item.phone ?? ''
  website.value = item.website ?? ''
  category.value = normalizeVenueCategory(item.category)
}

async function loadBranches() {
  if (!venue.value) return

  branchesLoading.value = true
  branchError.value = ''

  try {
    const response = await api<{ branches: VenueBranch[] }>(`/venues/${venue.value.id}/branches`)
    branches.value = response.branches
  } catch (exception) {
    branchError.value = exception instanceof ApiError ? exception.message : 'Could not load branches.'
  } finally {
    branchesLoading.value = false
  }
}

async function addBranch() {
  if (!venue.value) return

  if (!branchAddressInput.value?.validateSelection()) {
    branchError.value = 'Select a branch address from the Google suggestions list.'
    return
  }

  try {
    await addBranchAction.run(async () => {
      branchError.value = ''

      try {
        const response = await api<{ branch: VenueBranch }>(`/venues/${venue.value!.id}/branches`, {
          method: 'POST',
          body: {
            name: branchName.value,
            address: branchAddress.value,
            latitude: branchLatitude.value ?? undefined,
            longitude: branchLongitude.value ?? undefined,
            google_place_id: branchGooglePlaceId.value ?? undefined,
          },
        })

        branches.value = [...branches.value, response.branch].sort((a, b) => a.name.localeCompare(b.name))
        branchName.value = ''
        branchAddress.value = ''
        branchLatitude.value = null
        branchLongitude.value = null
        branchGooglePlaceId.value = null
      } catch (exception) {
        branchError.value = exception instanceof ApiError ? exception.message : 'Could not add branch.'
        throw exception
      }
    })
  } catch {
    // Button shows Failed; field error stays inline.
  }
}

async function removeBranch(branch: VenueBranch) {
  if (!venue.value) return

  deletingBranchId.value = branch.id
  branchError.value = ''

  try {
    await api(`/venues/${venue.value.id}/branches/${branch.id}`, { method: 'DELETE' })
    branches.value = branches.value.filter((item) => item.id !== branch.id)
  } catch (exception) {
    branchError.value = exception instanceof ApiError ? exception.message : 'Could not remove branch.'
  } finally {
    deletingBranchId.value = null
  }
}

async function loadVenue() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<{ venue: Venue }>(`/venues/${venueId.value}`)
    hydrateForm(response.venue)
    await loadBranches()
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not load venue.'
    if (isVenueAccessDenied(exception)) {
      error.value = VENUE_ACCESS_DENIED_MESSAGE
    }
  } finally {
    loading.value = false
  }
}

async function saveVenue() {
  if (!venue.value) return

  if (!addressInput.value?.validateSelection()) {
    error.value = 'Select an address from the Google suggestions list.'
    return
  }

  try {
    await saveVenueAction.run(async () => {
      error.value = ''

      try {
        const response = await api<{ venue: Venue }>(`/venues/${venue.value!.id}`, {
          method: 'PUT',
          body: {
            name: name.value,
            slug: slug.value || undefined,
            address: address.value || undefined,
            latitude: latitude.value ?? undefined,
            longitude: longitude.value ?? undefined,
            google_place_id: googlePlaceId.value ?? undefined,
            phone: phone.value || undefined,
            website: website.value || undefined,
            category: category.value,
          },
        })

        hydrateForm(response.venue)
      } catch (exception) {
        error.value = exception instanceof ApiError ? exception.message : 'Could not save venue.'
        throw exception
      }
    })
  } catch {
    // Button shows Failed; field error stays inline.
  }
}

async function copyLandingUrl() {
  if (!landingUrl.value) return

  try {
    await navigator.clipboard.writeText(landingUrl.value)
    linkCopied.value = true
    window.setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch {
    error.value = 'Could not copy link. Copy the URL manually.'
  }
}

function openPublicPage() {
  if (!landingUrl.value) return
  window.open(landingUrl.value, '_blank', 'noopener,noreferrer')
}

function downloadQrPng() {
  if (!landingUrl.value || !venue.value) return

  const slug = publicSlug.value || venue.value.slug
  if (!downloadVenueQrPng('#venue-settings-qr', slug)) {
    error.value = 'QR is not ready yet. Wait a moment and try again.'
    return
  }

  error.value = ''
}

onMounted(loadVenue)
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <AppBadge tone="blue">Venue settings</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-ink">
          {{ venue?.name ?? 'Venue settings' }}
        </h1>
        <p class="mt-2 text-ink-muted">Manage this venue as its own workspace.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" @click="router.push(`/my-venues/${venueId}/setup-files`)">
          Files & docs
        </AppButton>
        <AppButton variant="secondary" @click="router.push(`/my-venues/${venueId}/design`)">
          Design previews
        </AppButton>
        <AppButton variant="secondary" @click="router.push('/my-venues')">Back to My Venues</AppButton>
      </div>
    </div>

    <AppCard v-if="loading">
      <p class="text-sm font-bold text-ink-muted">Loading venue...</p>
    </AppCard>

    <AppCard v-else-if="error && !venue">
      <p class="text-sm font-bold text-danger">{{ error }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <AppButton v-if="error === VENUE_ACCESS_DENIED_MESSAGE" @click="router.push('/my-venues')">
          Back to My Venues
        </AppButton>
        <AppButton v-else variant="secondary" @click="loadVenue">Try again</AppButton>
      </div>
    </AppCard>

    <div v-else-if="venue" class="grid gap-5">
      <div class="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div class="space-y-5">
          <AppCard>
            <h2 class="text-xl font-black text-ink">App branding</h2>
            <p class="mt-2 text-sm font-semibold text-ink-muted">
              Upload your files on <strong class="text-ink">Files &amp; docs</strong>. The Flotory team uses them to set up branding and the mobile app after you submit for review.
            </p>

            <div class="mt-5 overflow-hidden rounded-2xl border border-border">
              <img :src="venueCoverUrl(venue)" alt="" class="h-28 w-full object-cover">
              <div class="flex items-center gap-3 p-4">
                <img :src="venueLogoUrl(venue)" :alt="venue.name" class="size-14 rounded-xl object-cover border border-border">
                <div>
                  <p class="text-sm font-bold text-ink">Live preview</p>
                  <p class="text-xs font-medium text-ink-muted">Shown after Flotory approves your listing</p>
                </div>
              </div>
            </div>

            <AppButton class="mt-4" variant="secondary" @click="router.push(`/my-venues/${venueId}/setup-files`)">
              Manage files &amp; docs
            </AppButton>
          </AppCard>
        </div>

        <AppCard wrapper-class="relative">
          <h2 class="text-xl font-black text-ink">Public venue</h2>
          <p class="mt-2 text-sm font-semibold text-ink-muted">
            Customers use this link to join your loyalty program. It updates when you change the slug (save to apply).
          </p>
          <p class="mt-4 break-all rounded-2xl bg-surface-muted px-4 py-3 text-sm font-semibold text-ink border border-border">
            {{ landingUrl || 'Save a slug to generate your public link' }}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <AppButton variant="secondary" size="sm" :disabled="!landingUrl" @click="copyLandingUrl">
              {{ linkCopied ? 'Copied' : 'Copy link' }}
            </AppButton>
            <AppButton variant="secondary" size="sm" :disabled="!landingUrl" @click="openPublicPage">
              Open public page
            </AppButton>
            <AppButton variant="secondary" size="sm" :disabled="!landingUrl" @click="downloadQrPng">
              Download QR
            </AppButton>
          </div>
          <div id="venue-settings-qr" class="pointer-events-none absolute -left-[9999px] top-0 opacity-0" aria-hidden="true">
            <QrcodeVue
              v-if="landingUrl"
              :value="landingUrl"
              :size="220"
              level="M"
              render-as="canvas"
              :margin="2"
            />
          </div>

          <form class="mt-8 grid gap-4 border-t border-border pt-8" @submit.prevent="saveVenue">
          <div class="grid gap-4 md:grid-cols-[1fr_180px]">
            <div>
              <label class="text-sm font-bold text-ink-muted" for="edit-venue-name">Venue name</label>
              <input id="edit-venue-name" v-model="name" required class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface">
            </div>
            <div>
              <label class="text-sm font-bold text-ink-muted" for="edit-venue-slug">Slug</label>
              <input
                id="edit-venue-slug"
                v-model="slug"
                :disabled="slugLocked"
                :readonly="slugLocked"
                class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
              >
              <p v-if="slugLocked" class="mt-2 text-xs font-medium text-ink-muted">
                Locked after publish so printed QR codes keep working.
              </p>
            </div>
            <div>
              <label class="text-sm font-bold text-ink-muted" for="edit-venue-category">Category</label>
              <select
                id="edit-venue-category"
                v-model="category"
                class="mt-2 h-12 w-full appearance-none rounded-2xl border border-border bg-surface-muted bg-[length:14px_14px] bg-no-repeat py-0 pl-4 pr-10 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface"
                :style="selectChevronStyle"
              >
                <option v-for="option in categoryOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-bold text-ink-muted" for="edit-venue-website">Website optional</label>
              <input id="edit-venue-website" v-model="website" class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface" placeholder="https://example.com">
            </div>
            <PhoneInput id="edit-venue-phone" v-model="phone" label="Phone" />
            <div class="md:col-span-2">
              <VenueAddressInput
                id="edit-venue-address"
                ref="addressInput"
                v-model:address="address"
                v-model:latitude="latitude"
                v-model:longitude="longitude"
                v-model:google-place-id="googlePlaceId"
                :quota-remaining="addressQuotaRemaining"
                :disabled="addressQuotaRemaining === 0"
                hint="Shown on your public venue page. Used later to show nearby venues to customers."
              />
            </div>
          </div>

          <p v-if="error" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>
            <AsyncActionButton
              type="submit"
              idle-label="Save venue"
              loading-label="Saving…"
              success-label="Saved ✓"
              :loading="saveVenueAction.loading"
              :success="saveVenueAction.success"
              :error="saveVenueAction.error"
            />
          </form>
        </AppCard>
      </div>

      <AppCard>
        <h2 class="text-xl font-black text-ink">Locations</h2>
        <p class="mt-2 text-sm font-semibold text-ink-muted">
          Add extra branches that share the same rewards, NFC tags, and wallet card. Each location gets its own name and address.
        </p>

        <div v-if="branchesLoading" class="mt-5 text-sm font-bold text-ink-muted">Loading branches…</div>

        <ul v-else-if="branches.length" class="mt-5 divide-y divide-border rounded-2xl border border-border">
          <li v-for="branch in branches" :key="branch.id" class="flex items-start justify-between gap-4 px-4 py-3">
            <div class="min-w-0">
              <p class="text-sm font-bold text-ink">{{ branch.name }}</p>
              <p v-if="branch.address" class="mt-1 text-xs font-medium text-ink-muted">{{ branch.address }}</p>
            </div>
            <AppButton
              variant="secondary"
              size="sm"
              :disabled="deletingBranchId === branch.id"
              @click="removeBranch(branch)"
            >
              {{ deletingBranchId === branch.id ? 'Removing…' : 'Remove' }}
            </AppButton>
          </li>
        </ul>

        <p v-else class="mt-5 text-sm font-semibold text-ink-muted">No extra branches yet. Your main venue address above is the first location.</p>

        <form class="mt-6 grid gap-4 border-t border-border pt-6" @submit.prevent="addBranch">
          <div>
            <label class="text-sm font-bold text-ink-muted" for="branch-name">Branch name</label>
            <input
              id="branch-name"
              v-model="branchName"
              required
              class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface"
              placeholder="Mio Gelato · Vake"
            >
          </div>
          <VenueAddressInput
            id="branch-address"
            ref="branchAddressInput"
            v-model:address="branchAddress"
            v-model:latitude="branchLatitude"
            v-model:longitude="branchLongitude"
            v-model:google-place-id="branchGooglePlaceId"
            label="Branch address"
            hint="Customers can join from any branch link. Rewards stay shared across all locations."
          />
          <p v-if="branchError" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ branchError }}</p>
          <AsyncActionButton
            type="submit"
            idle-label="Add branch"
            loading-label="Adding…"
            success-label="Added ✓"
            :loading="addBranchAction.loading"
            :success="addBranchAction.success"
            :error="addBranchAction.error"
            :disabled="!branchName.trim()"
          />
        </form>
      </AppCard>
    </div>
  </AppShell>
</template>

