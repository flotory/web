import { usePathname, useRouter, useSegments } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'

import { hapticLightTap } from '../lib/haptics'
import { isStampSignatureAcknowledged } from '../lib/stampAck'
import { stampUpdateSignature } from '../lib/stampLiveUpdate'
import { useRealtime } from '../providers/RealtimeProvider'
import type { StampAddedPayload } from '../types/realtime'
import { useStampWatchdog } from './useStampWatchdog'

function isOnCardScreen(segments: string[], pathname: string, cardId: number): boolean {
  const cardIndex = segments.indexOf('card')
  if (cardIndex !== -1) {
    const idSegment = segments[cardIndex + 1]
    if (idSegment != null && !idSegment.startsWith('[') && Number(idSegment) === cardId) {
      return true
    }
  }

  const match = pathname.match(/\/card\/(\d+)/)
  return match !== null && Number(match[1]) === cardId
}

/** Keeps customer stamp updates flowing via polling plus one-time card navigation. */
export function useCustomerStampSync() {
  const watchdog = useStampWatchdog()
  const router = useRouter()
  const pathname = usePathname()
  const segments = useSegments()
  const { latestStamp, clearLatestStamp } = useRealtime()
  const lastNavigatedSignature = useRef('')

  const openCard = useCallback(
    (payload: StampAddedPayload) => {
      router.navigate({
        pathname: '/card/[cardId]',
        params: {
          cardId: String(payload.customer.id),
          venueId: String(payload.venue.id),
        },
      })
    },
    [router],
  )

  useEffect(() => {
    if (!latestStamp) {
      return
    }

    const signature = stampUpdateSignature(latestStamp)

    if (isStampSignatureAcknowledged(signature)) {
      clearLatestStamp()
      return
    }

    const onCard = isOnCardScreen(segments, pathname, latestStamp.customer.id)

    if (onCard) {
      lastNavigatedSignature.current = signature
      return
    }

    if (lastNavigatedSignature.current === signature) {
      clearLatestStamp()
      return
    }

    lastNavigatedSignature.current = signature
    hapticLightTap()
    openCard(latestStamp)
  }, [clearLatestStamp, latestStamp, pathname, segments, openCard])
  return watchdog
}
