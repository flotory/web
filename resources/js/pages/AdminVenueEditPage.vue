<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import VenueAdminSetupFiles from '@/components/loyalty/VenueAdminSetupFiles.vue'
import AdminVenueNfcTags from '@/components/admin/AdminVenueNfcTags.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PhoneInput from '@/components/ui/PhoneInput.vue'
import VenueAddressInput from '@/components/ui/VenueAddressInput.vue'
import { useAdminVenueManagement, type AdminManageVenue } from '@/composables/useAdminVenueManagement'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import { downloadVenueQrPng } from '@/lib/downloadVenueQrPng'
import { normalizeVenueCategory } from '@/lib/defaultImages'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { listingStatusLabel, listingStatusTone } from '@/lib/venueListing'
import { venueCoverUrl, venueHasCustomCover, venueHasCustomLogo, venueLogoUrl } from '@/lib/venueMedia'
import type { Venue, VenueCategory } from '@/types'

const route = useRoute()
const router = useRouter()
const { loadVenue } = useAdminVenueManagement()

const venue = ref<AdminManageVenue | null>(null)
const loading = ref(true)
const saveVenueAction = useAsyncAction()
const error = ref('')
const name = ref('')
const slug = ref('')
const address = ref('')
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const googlePlaceId = ref<string | null>(null)
const addressInput = ref<InstanceType<typeof VenueAddressInput> | null>(null)
const phone = ref('')
const website = ref('')
const category = ref<VenueCategory>('cafe')

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
const apiBase = computed(() => `/admin/manage-venues/${venueId.value}`)

function onBrandingUpdated(updated: Venue) {
  if (!venue.value) {
    return
  }

  hydrateForm({ ...venue.value, ...updated })
}

function hydrateForm(item: AdminManageVenue) {
  venue.value = item
  name.value = item.name
  slug.value = item.slug
  address.value = item.address ?? ''
  latitude.value = item.latitude ?? null
  longitude.value = item.longitude ?? null
  googlePlaceId.value = item.google_place_id ?? null
  phone.value = item.phone ?? ''
  website.value = item.website ?? ''
  category.value = normalizeVenueCategory(item.category)
}

async function loadPage() {
  loading.value = true
  error.value = ''

  try {
    const response = await loadVenue(venueId.value)
    hydrateForm(response.venue)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not load venue.'
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
        const response = await api<{ venue: AdminManageVenue }>(apiBase.value, {
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
  if (!downloadVenueQrPng('#admin-venue-edit-qr', slug)) {
    error.value = 'QR is not ready yet. Wait a moment and try again.'
    return
  }

  error.value = ''
}

onMounted(loadPage)
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <AppBadge tone="blue">Admin · Manage venues</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-ink">
          {{ venue?.name ?? 'Edit venue' }}
        </h1>
        <p class="mt-2 text-ink-muted">Edit venue details on behalf of the owner.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" @click="router.push(`/admin/manage-venues/${venueId}/design`)">
          Design previews
        </AppButton>
        <AppButton variant="secondary" @click="router.push('/admin/manage-venues')">
          Back to Manage venues
        </AppButton>
      </div>
    </div>

    <AppCard v-if="loading">
      <p class="text-sm font-bold text-ink-muted">Loading venue...</p>
    </AppCard>

    <AppCard v-else-if="error && !venue">
      <p class="text-sm font-bold text-danger">{{ error }}</p>
      <AppButton class="mt-4" @click="loadPage">Retry</AppButton>
    </AppCard>

    <div v-else-if="venue" class="grid gap-5">
      <AppCard>
        <div class="flex flex-wrap items-center gap-2">
          <AppBadge :tone="listingStatusTone(venue.status)">{{ listingStatusLabel(venue.status) }}</AppBadge>
          <AppBadge v-if="venue.archived" tone="amber">Archived</AppBadge>
        </div>
        <p class="mt-3 text-sm font-medium text-ink-muted">
          Owner: {{ venue.owner?.name ?? 'Unknown' }} · {{ venue.owner?.email ?? '—' }}
        </p>
        <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {{ venue.customers_count ?? 0 }} customers · {{ venue.rewards_count ?? 0 }} rewards
        </p>
      </AppCard>

      <div class="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <AppCard wrapper-class="overflow-hidden p-0">
          <img :src="venueCoverUrl(venue)" alt="" class="h-36 w-full object-cover">
          <div class="p-5">
            <h2 class="text-xl font-black text-ink">Live branding</h2>
            <p class="mt-2 text-sm font-medium text-ink-muted">
              Shown in the mobile app and web after you crop owner files below. Logo is required before approval.
            </p>
            <div class="mt-4 flex items-center gap-3">
              <div class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-surface-muted">
                <img :src="venueLogoUrl(venue)" :alt="venue.name" class="size-full object-cover">
              </div>
              <div class="text-xs font-semibold text-ink-muted">
                <p :class="venueHasCustomLogo(venue) ? 'text-success' : 'text-danger'">
                  Logo {{ venueHasCustomLogo(venue) ? 'applied' : 'not applied yet' }}
                </p>
                <p class="mt-1" :class="venueHasCustomCover(venue) ? 'text-ink' : 'text-ink-soft'">
                  Cover {{ venueHasCustomCover(venue) ? 'applied' : 'optional' }}
                </p>
              </div>
            </div>
          </div>
        </AppCard>

        <AppCard wrapper-class="relative">
          <h2 class="text-xl font-black text-ink">Public venue</h2>
          <p class="mt-4 break-all rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm font-semibold text-ink">
            {{ landingUrl || 'Save a slug to generate the public link' }}
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
          <div id="admin-venue-edit-qr" class="pointer-events-none absolute -left-[9999px] top-0 opacity-0" aria-hidden="true">
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
                <label class="text-sm font-bold text-ink-muted" for="admin-edit-venue-name">Venue name</label>
                <input id="admin-edit-venue-name" v-model="name" required class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft">
              </div>
              <div>
                <label class="text-sm font-bold text-ink-muted" for="admin-edit-venue-slug">Slug</label>
                <input
                  id="admin-edit-venue-slug"
                  v-model="slug"
                  :disabled="slugLocked"
                  :readonly="slugLocked"
                  class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
                >
                <p v-if="slugLocked" class="mt-2 text-xs font-medium text-ink-muted">
                  Locked after publish so printed QR codes keep working.
                </p>
              </div>
              <div>
                <label class="text-sm font-bold text-ink-muted" for="admin-edit-venue-category">Category</label>
                <select
                  id="admin-edit-venue-category"
                  v-model="category"
                  class="mt-2 h-12 w-full appearance-none rounded-2xl border border-border bg-surface bg-[length:14px_14px] bg-no-repeat py-0 pl-4 pr-10 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface"
                  :style="selectChevronStyle"
                >
                  <option v-for="option in categoryOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-bold text-ink-muted" for="admin-edit-venue-website">Website optional</label>
                <input id="admin-edit-venue-website" v-model="website" class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft" placeholder="https://example.com">
              </div>
              <PhoneInput id="admin-edit-venue-phone" v-model="phone" label="Phone" />
              <div class="md:col-span-2">
                <VenueAddressInput
                  id="admin-edit-venue-address"
                  ref="addressInput"
                  v-model:address="address"
                  v-model:latitude="latitude"
                  v-model:longitude="longitude"
                  v-model:google-place-id="googlePlaceId"
                  hint="Pick a Google suggestion so customers can find this venue on the map."
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

      <VenueAdminSetupFiles
        :venue-id="venueId"
        @branding-updated="onBrandingUpdated"
      />

      <AdminVenueNfcTags :venue-id="venueId" />
    </div>
  </AppShell>
</template>
