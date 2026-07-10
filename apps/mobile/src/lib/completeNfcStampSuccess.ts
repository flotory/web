import type { ImperativeRouter } from 'expo-router'

import { refreshCustomerSurfacesAfterStamp } from './customerData'
import { notifyCustomerSurfaceRefresh } from './customerSurfaceRefresh'
import type { NfcStampResponse } from './nfcStamp'
import { cardRouteFromNfcStamp, nfcResponseToStampPayload } from './stampLiveUpdate'
import type { StampAddedPayload } from '../types/realtime'

export async function completeNfcStampSuccess(
  response: NfcStampResponse,
  authToken: string,
  ingestStamp: (payload: StampAddedPayload) => void,
  router: Pick<ImperativeRouter, 'navigate' | 'replace'>,
  navigation: 'navigate' | 'replace' = 'navigate',
): Promise<void> {
  const venueId = response.venue?.id ?? response.customer.venue_id

  try {
    await refreshCustomerSurfacesAfterStamp(authToken, venueId)
  } catch {
    // Stamp already succeeded — still navigate; card screen can retry load.
  }

  ingestStamp(nfcResponseToStampPayload(response))
  notifyCustomerSurfaceRefresh()

  const route = cardRouteFromNfcStamp(response, {
    showNfcEducation: Boolean(response.joined_on_scan),
  })
  if (navigation === 'replace') {
    router.replace(route)
  } else {
    router.navigate(route)
  }
}
