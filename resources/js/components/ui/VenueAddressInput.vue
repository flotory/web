<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { loadGoogleMaps, resolveGoogleMapsApiKey } from '@/lib/googleMapsLoader'

const props = withDefaults(defineProps<{
  id: string
  label?: string
  placeholder?: string
  hint?: string
  quotaRemaining?: number | null
  disabled?: boolean
}>(), {
  label: 'Address',
  placeholder: 'Search for your venue address',
  hint: 'Pick a Google suggestion so customers can find you on the map.',
  quotaRemaining: null,
  disabled: false,
})

const address = defineModel<string>('address', { default: '' })
const latitude = defineModel<number | null>('latitude', { default: null })
const longitude = defineModel<number | null>('longitude', { default: null })
const googlePlaceId = defineModel<string | null>('googlePlaceId', { default: null })

const isLocalDev = import.meta.env.DEV

const inputRef = ref<HTMLInputElement | null>(null)
const mapsConfigured = ref(false)
const autocompleteReady = ref(false)
const loadError = ref('')
const selectionRequired = ref(false)

const quotaHint = computed(() => {
  if (props.quotaRemaining === null) {
    return null
  }

  if (props.quotaRemaining <= 0) {
    return 'Address updates are limited to 3 per day. You can try again tomorrow.'
  }

  return `${props.quotaRemaining} address update${props.quotaRemaining === 1 ? '' : 's'} left today.`
})

let autocomplete: google.maps.places.Autocomplete | null = null
let placeListener: google.maps.MapsEventListener | null = null
let placesService: google.maps.places.PlacesService | null = null
let applyingPlace = false
let suppressInputUntil = 0
let lastSelectedAddress = ''

function syncInputValue(value: string) {
  if (!inputRef.value || inputRef.value.value === value) {
    return
  }

  inputRef.value.value = value
}

function commitResolvedPlace(place: google.maps.places.PlaceResult) {
  const formatted = place.formatted_address?.trim() ?? ''
  const location = place.geometry?.location

  applyingPlace = true
  suppressInputUntil = Date.now() + 400

  if (!formatted || !location) {
    selectionRequired.value = true
    latitude.value = null
    longitude.value = null
    googlePlaceId.value = null
    applyingPlace = false
    return
  }

  address.value = formatted
  latitude.value = location.lat()
  longitude.value = location.lng()
  googlePlaceId.value = place.place_id ?? null
  selectionRequired.value = false

  void nextTick(() => {
    lastSelectedAddress = inputRef.value?.value.trim() || formatted
    applyingPlace = false
  })
}

function resolvePlaceDetails(placeId: string) {
  if (!placesService) {
    placesService = new google.maps.places.PlacesService(document.createElement('div'))
  }

  placesService.getDetails(
    { placeId, fields: ['formatted_address', 'geometry', 'place_id'] },
    (detail, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
        commitResolvedPlace(detail)
        return
      }

      applyingPlace = true
      selectionRequired.value = true
      latitude.value = null
      longitude.value = null
      googlePlaceId.value = null
      applyingPlace = false
    },
  )
}

function applyPlace(place: google.maps.places.PlaceResult) {
  const formatted = place.formatted_address?.trim() ?? ''
  const location = place.geometry?.location

  if ((!formatted || !location) && place.place_id) {
    applyingPlace = true
    suppressInputUntil = Date.now() + 400
    resolvePlaceDetails(place.place_id)
    return
  }

  commitResolvedPlace(place)
}

function onNativeInput() {
  if (applyingPlace || Date.now() < suppressInputUntil || !inputRef.value) {
    return
  }

  const nextValue = inputRef.value.value.trim()

  if (nextValue === lastSelectedAddress) {
    return
  }

  address.value = nextValue
  latitude.value = null
  longitude.value = null
  googlePlaceId.value = null
  selectionRequired.value = Boolean(nextValue)
}

function validateSelection(): boolean {
  const trimmed = address.value.trim()

  if (!trimmed) {
    selectionRequired.value = false
    return true
  }

  if (latitude.value === null || longitude.value === null) {
    selectionRequired.value = true
    return false
  }

  selectionRequired.value = false
  return true
}

defineExpose({ validateSelection })

onMounted(async () => {
  await nextTick()

  const apiKey = await resolveGoogleMapsApiKey()
  mapsConfigured.value = apiKey.length > 0

  if (address.value) {
    lastSelectedAddress = address.value.trim()
    syncInputValue(address.value)
  }

  if (!apiKey || !inputRef.value) {
    return
  }

  inputRef.value.addEventListener('input', onNativeInput)

  try {
    await loadGoogleMaps(apiKey)
    autocomplete = new google.maps.places.Autocomplete(inputRef.value, {
      fields: ['formatted_address', 'geometry', 'place_id'],
    })
    placeListener = autocomplete.addListener('place_changed', () => {
      applyPlace(autocomplete?.getPlace() ?? {})
    })
    autocompleteReady.value = true
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Could not load Google address search.'
  }
})

onBeforeUnmount(() => {
  inputRef.value?.removeEventListener('input', onNativeInput)
  placeListener?.remove()
  placeListener = null
  autocomplete = null
})

watch(address, (value) => {
  if (applyingPlace) {
    return
  }

  syncInputValue(value)

  if (value.trim() === '') {
    lastSelectedAddress = ''
    latitude.value = null
    longitude.value = null
    googlePlaceId.value = null
    selectionRequired.value = false
    return
  }

  if (
    !autocompleteReady.value
    && value.trim() !== lastSelectedAddress
    && (latitude.value === null || longitude.value === null)
  ) {
    googlePlaceId.value = null
    selectionRequired.value = true
  }
})
</script>

<template>
  <div class="venue-address-input">
    <label class="text-sm font-bold text-ink-muted" :for="id">{{ label }}</label>
    <input
      :id="id"
      ref="inputRef"
      :disabled="disabled"
      class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft disabled:cursor-not-allowed disabled:opacity-60"
      :placeholder="placeholder"
      autocomplete="off"
    >
    <p v-if="hint" class="mt-2 text-xs font-medium text-ink-muted">
      {{ hint }}
    </p>
    <p v-if="quotaHint" class="mt-2 text-xs font-semibold" :class="quotaRemaining === 0 ? 'text-danger' : 'text-ink-muted'">
      {{ quotaHint }}
    </p>
    <p v-if="!mapsConfigured" class="mt-2 text-xs font-semibold text-amber-800">
      <template v-if="isLocalDev">
        Google address search is not configured. Add <code class="rounded bg-amber-100 px-1">VITE_GOOGLE_MAPS_API_KEY</code> to
        <code class="rounded bg-amber-100 px-1">.env.secrets</code>, run
        <code class="rounded bg-amber-100 px-1">./scripts/setup-local.sh</code>, then restart Docker
        (<code class="rounded bg-amber-100 px-1">docker compose up --build</code>).
      </template>
      <template v-else>
        Google address search is not available right now. You can still save the venue and add the address later.
      </template>
    </p>
    <p v-else-if="loadError" class="mt-2 text-xs font-semibold text-danger">
      {{ loadError }}
    </p>
    <p v-else-if="selectionRequired" class="mt-2 text-xs font-semibold text-danger">
      Select an address from the Google suggestions list.
    </p>
  </div>
</template>
