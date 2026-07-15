import * as Location from 'expo-location'

import type { NfcStampLocation } from './nfcStamp'
import { nfcLog } from './nfcReader'

/**
 * Read a fresh fix at tap time (BUSINESS_RULES S10).
 *
 * Deliberately a one-shot read rather than the cached `useCustomerLocation`
 * value: that cache can hold a fix from another city, which would either wave
 * through a remote tap or reject a customer standing at the counter.
 *
 * Never throws and never blocks the tap for long — on denial, failure, or
 * timeout it returns null and lets the server decide what a location-less tap
 * is worth. Awarding a stamp is not this function's call to make.
 */
const TAP_LOCATION_TIMEOUT_MS = 4_000

export async function readTapLocation(): Promise<NfcStampLocation | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync()

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      const requested = await Location.requestForegroundPermissionsAsync()

      if (requested.status !== Location.PermissionStatus.GRANTED) {
        nfcLog('readTapLocation: permission denied')
        return null
      }
    }

    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      TAP_LOCATION_TIMEOUT_MS,
    )

    if (position === null) {
      nfcLog('readTapLocation: timed out')
      return null
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
    }
  } catch (error) {
    nfcLog('readTapLocation: failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms)
      }),
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}
