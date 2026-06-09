import { computed, onMounted, ref } from 'vue'

import type { Coordinates } from '@/lib/distance'

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable'

export function useCustomerLocation(options?: { autoRequest?: boolean }) {
  const status = ref<LocationStatus>('idle')
  const coords = ref<Coordinates | null>(null)

  function requestLocation() {
    if (!navigator.geolocation) {
      status.value = 'unavailable'
      return
    }

    status.value = 'loading'
    navigator.geolocation.getCurrentPosition(
      (position) => {
        coords.value = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        status.value = 'granted'
      },
      () => {
        status.value = 'denied'
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 },
    )
  }

  onMounted(() => {
    if (options?.autoRequest) {
      requestLocation()
    }
  })

  const hasLocation = computed(() => coords.value !== null)

  return {
    status,
    coords,
    hasLocation,
    requestLocation,
    refreshLocation: requestLocation,
  }
}
