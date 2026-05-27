<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import type { Venue } from '@/types'

const route = useRoute()
const router = useRouter()

const venue = ref<Venue | null>(null)
const loading = ref(true)
const saving = ref(false)
const logoUploading = ref(false)
const error = ref('')
const logoInput = ref<HTMLInputElement | null>(null)
const name = ref('')
const slug = ref('')
const address = ref('')
const phone = ref('')
const website = ref('')

const venueId = computed(() => Number(route.params.id))

function hydrateForm(item: Venue) {
  venue.value = item
  name.value = item.name
  slug.value = item.slug
  address.value = item.address ?? ''
  phone.value = item.phone ?? ''
  website.value = item.website ?? ''
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

  saving.value = true
  error.value = ''

  try {
    const response = await api<{ venue: Venue }>(`/venues/${venue.value.id}`, {
      method: 'PUT',
      body: {
        name: name.value,
        slug: slug.value || undefined,
        address: address.value || undefined,
        phone: phone.value || undefined,
        website: website.value || undefined,
      },
    })

    hydrateForm(response.venue)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not save venue.'
  } finally {
    saving.value = false
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

    <div v-else-if="venue" class="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <AppCard>
        <div class="grid place-items-center text-center">
          <div class="grid size-32 place-items-center overflow-hidden rounded-[2rem] bg-slate-100 text-5xl font-black text-slate-400 ring-1 ring-slate-200">
            <img v-if="venue.logo" :src="venue.logo" alt="" class="size-full object-cover">
            <span v-else>{{ venue.name.slice(0, 1) }}</span>
          </div>

          <h2 class="mt-5 text-2xl font-black text-slate-950">Venue logo</h2>
          <p class="mt-2 text-sm font-semibold text-slate-500">Upload a square PNG, JPG, or WebP image.</p>

          <input ref="logoInput" class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" @change="uploadLogo">

          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <AppButton variant="secondary" :disabled="logoUploading" @click="openLogoPicker">
              {{ logoUploading ? 'Uploading...' : (venue.logo ? 'Replace logo' : 'Upload logo') }}
            </AppButton>
            <AppButton v-if="venue.logo" variant="ghost" :disabled="logoUploading" @click="deleteLogo">
              Delete logo
            </AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard>
        <form class="grid gap-4" @submit.prevent="saveVenue">
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
              <label class="text-sm font-bold text-slate-600" for="edit-venue-website">Website optional</label>
              <input id="edit-venue-website" v-model="website" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="https://example.com">
            </div>
            <div>
              <label class="text-sm font-bold text-slate-600" for="edit-venue-phone">Phone optional</label>
              <input id="edit-venue-phone" v-model="phone" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="+1 555 0100">
            </div>
            <div class="md:col-span-2">
              <label class="text-sm font-bold text-slate-600" for="edit-venue-address">Address optional</label>
              <input id="edit-venue-address" v-model="address" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="12 Market Street">
            </div>
          </div>

          <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>
          <AppButton type="submit" :disabled="saving">{{ saving ? 'Saving...' : 'Save venue' }}</AppButton>
        </form>
      </AppCard>
    </div>
  </AppShell>
</template>

