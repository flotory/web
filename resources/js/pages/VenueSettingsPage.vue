<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PhoneInput from '@/components/ui/PhoneInput.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import { normalizeVenueCategory } from '@/lib/defaultImages'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { venueCoverUrl, venueHasCustomCover, venueHasCustomLogo, venueLogoUrl } from '@/lib/venueMedia'
import type { Venue, VenueCategory } from '@/types'

const route = useRoute()
const router = useRouter()

const venue = ref<Venue | null>(null)
const loading = ref(true)
const saveVenueAction = useAsyncAction()
const logoUploading = ref(false)
const coverUploading = ref(false)
const error = ref('')
const logoInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)
const name = ref('')
const slug = ref('')
const address = ref('')
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
const linkCopied = ref(false)

const publicSlug = computed(() => slug.value.trim() || venue.value?.slug || '')
const landingUrl = computed(() => (publicSlug.value ? buildVenueLandingUrl(publicSlug.value) : ''))

function hydrateForm(item: Venue) {
  venue.value = item
  name.value = item.name
  slug.value = item.slug
  address.value = item.address ?? ''
  phone.value = item.phone ?? ''
  website.value = item.website ?? ''
  category.value = normalizeVenueCategory(item.category)
}

async function loadVenue() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<{ venue: Venue }>(`/venues/${venueId.value}`)
    hydrateForm(response.venue)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not load venue.'
  } finally {
    loading.value = false
  }
}

async function saveVenue() {
  if (!venue.value) return

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

function openLogoPicker() {
  logoInput.value?.click()
}

async function uploadLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file || !venue.value) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    error.value = 'Use a JPG, PNG, WebP, or GIF image. iPhone HEIC photos must be converted first (e.g. save to Photos as Most Compatible).'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be 5 MB or smaller.'
    return
  }

  logoUploading.value = true
  error.value = ''

  try {
    const body = new FormData()
    body.append('logo', file)

    const response = await api<{ venue: Venue }>(`/venues/${venue.value.id}/logo`, {
      method: 'POST',
      body,
    })

    hydrateForm(response.venue)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not upload logo.'
  } finally {
    logoUploading.value = false
  }
}

async function deleteLogo() {
  if (!venue.value) return

  logoUploading.value = true
  error.value = ''

  try {
    const response = await api<{ venue: Venue }>(`/venues/${venue.value.id}/logo`, {
      method: 'DELETE',
    })

    hydrateForm(response.venue)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not delete logo.'
  } finally {
    logoUploading.value = false
  }
}

function openCoverPicker() {
  coverInput.value?.click()
}

async function uploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file || !venue.value) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    error.value = 'Use a JPG, PNG, WebP, or GIF image.'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be 5 MB or smaller.'
    return
  }

  coverUploading.value = true
  error.value = ''

  try {
    const body = new FormData()
    body.append('cover', file)

    const response = await api<{ venue: Venue }>(`/venues/${venue.value.id}/cover`, {
      method: 'POST',
      body,
    })

    hydrateForm(response.venue)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not upload cover image.'
  } finally {
    coverUploading.value = false
  }
}

async function deleteCover() {
  if (!venue.value) return

  coverUploading.value = true
  error.value = ''

  try {
    const response = await api<{ venue: Venue }>(`/venues/${venue.value.id}/cover`, {
      method: 'DELETE',
    })

    hydrateForm(response.venue)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not delete cover image.'
  } finally {
    coverUploading.value = false
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

  const canvas = document.querySelector<HTMLCanvasElement>('#venue-settings-qr canvas')
  if (!canvas) {
    error.value = 'QR is not ready yet. Wait a moment and try again.'
    return
  }

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = 512
  exportCanvas.height = 512
  const ctx = exportCanvas.getContext('2d')
  if (!ctx) {
    error.value = 'Could not export QR. Try again.'
    return
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 512, 512)
  ctx.drawImage(canvas, 0, 0, 512, 512)

  const link = document.createElement('a')
  link.download = `${publicSlug.value || venue.value.slug}-qr.png`
  link.href = exportCanvas.toDataURL('image/png')
  document.body.appendChild(link)
  link.click()
  link.remove()
}

onMounted(loadVenue)
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <AppBadge tone="blue">Venue settings</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">
          {{ venue?.name ?? 'Venue settings' }}
        </h1>
        <p class="mt-2 text-slate-500">Manage this venue as its own workspace.</p>
      </div>
      <AppButton variant="secondary" @click="router.push('/my-venues')">Back to My Venues</AppButton>
    </div>

    <AppCard v-if="loading">
      <p class="text-sm font-bold text-slate-500">Loading venue...</p>
    </AppCard>

    <AppCard v-else-if="error && !venue">
      <p class="text-sm font-bold text-red-600">{{ error }}</p>
      <AppButton class="mt-4" @click="loadVenue">Retry</AppButton>
    </AppCard>

    <div v-else-if="venue" class="grid gap-5">
      <div class="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div class="space-y-5">
          <AppCard wrapper-class="overflow-hidden p-0">
            <img :src="venueCoverUrl(venue)" alt="" class="h-36 w-full object-cover">
            <div class="p-5 text-center">
              <h2 class="text-xl font-black text-slate-950">Cover image</h2>
              <p class="mt-2 text-sm font-semibold text-slate-500">Shown on your dashboard, landing page, and customer card.</p>
              <input ref="coverInput" class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" @change="uploadCover">
              <div class="mt-4 flex flex-wrap justify-center gap-2">
                <AppButton variant="secondary" :disabled="coverUploading" @click="openCoverPicker">
                  {{ coverUploading ? 'Uploading...' : (venueHasCustomCover(venue) ? 'Replace cover' : 'Upload cover') }}
                </AppButton>
                <AppButton v-if="venueHasCustomCover(venue)" variant="ghost" :disabled="coverUploading" @click="deleteCover">
                  Remove cover
                </AppButton>
              </div>
            </div>
          </AppCard>

          <AppCard>
            <div class="grid place-items-center text-center">
              <div class="grid size-32 place-items-center overflow-hidden rounded-[2rem] bg-slate-100 ring-1 ring-slate-200">
                <img :src="venueLogoUrl(venue)" :alt="venue.name" class="size-full object-cover">
              </div>

              <h2 class="mt-5 text-2xl font-black text-slate-950">Venue logo</h2>
              <p class="mt-2 text-sm font-semibold text-slate-500">Upload a square PNG, JPG, or WebP image.</p>

              <input ref="logoInput" class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" @change="uploadLogo">

              <div class="mt-5 flex flex-wrap justify-center gap-2">
                <AppButton variant="secondary" :disabled="logoUploading" @click="openLogoPicker">
                  {{ logoUploading ? 'Uploading...' : (venueHasCustomLogo(venue) ? 'Replace logo' : 'Upload logo') }}
                </AppButton>
                <AppButton v-if="venueHasCustomLogo(venue)" variant="ghost" :disabled="logoUploading" @click="deleteLogo">
                  Delete logo
                </AppButton>
              </div>
            </div>
          </AppCard>
        </div>

        <AppCard wrapper-class="relative">
          <h2 class="text-xl font-black text-slate-950">Public venue</h2>
          <p class="mt-2 text-sm font-semibold text-slate-500">
            Customers use this link to join your loyalty program. It updates when you change the slug (save to apply).
          </p>
          <p class="mt-4 break-all rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
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

          <form class="mt-8 grid gap-4 border-t border-slate-200 pt-8" @submit.prevent="saveVenue">
          <div class="grid gap-4 md:grid-cols-[1fr_180px]">
            <div>
              <label class="text-sm font-bold text-slate-600" for="edit-venue-name">Venue name</label>
              <input id="edit-venue-name" v-model="name" required class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
            </div>
            <div>
              <label class="text-sm font-bold text-slate-600" for="edit-venue-slug">Slug</label>
              <input id="edit-venue-slug" v-model="slug" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
            </div>
            <div>
              <label class="text-sm font-bold text-slate-600" for="edit-venue-category">Category</label>
              <select
                id="edit-venue-category"
                v-model="category"
                class="mt-2 h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 bg-[length:14px_14px] bg-no-repeat py-0 pl-4 pr-10 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
                :style="selectChevronStyle"
              >
                <option v-for="option in categoryOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-bold text-slate-600" for="edit-venue-website">Website optional</label>
              <input id="edit-venue-website" v-model="website" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="https://example.com">
            </div>
            <PhoneInput id="edit-venue-phone" v-model="phone" label="Phone" />
            <div class="md:col-span-2">
              <label class="text-sm font-bold text-slate-600" for="edit-venue-address">Address</label>
              <input
                id="edit-venue-address"
                v-model="address"
                class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
                placeholder="12 Market Street, Toruń"
              >
              <p class="mt-2 text-xs font-medium text-slate-500">
                Shown on your public venue page and used for Google Maps.
              </p>
            </div>
          </div>

          <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>
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
    </div>
  </AppShell>
</template>

