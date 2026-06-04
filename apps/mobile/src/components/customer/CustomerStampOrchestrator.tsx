import { usePathname, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'

import { useStampWatchdog } from '../../hooks/useStampWatchdog'
import { hapticLightTap } from '../../lib/haptics'
import { stampUpdateSignature } from '../../lib/stampLiveUpdate'
import { useRealtime } from '../../providers/RealtimeProvider'
import type { StampAddedPayload } from '../../types/realtime'

function isOnCardScreen(pathname: string, cardId: number): boolean {
  const match = pathname.match(/\/card\/(\d+)/)
  return match !== null && Number(match[1]) === cardId
}

/** Navigates to the stamped card; toast + slot animation run only on the card screen. */
export default function CustomerStampOrchestrator() {
  useStampWatchdog()
  const router = useRouter()
  const pathname = usePathname()
  const { latestStamp } = useRealtime()
  const lastNavigatedSignature = useRef('')

  const openCard = useCallback(
    (payload: StampAddedPayload) => {
      router.push({
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
      lastNavigatedSignature.current = ''
      return
    }

    const signature = stampUpdateSignature(latestStamp)
    const onCard = isOnCardScreen(pathname, latestStamp.customer.id)

    if (onCard) {
      lastNavigatedSignature.current = signature
      return
    }

    if (lastNavigatedSignature.current === signature) {
      return
    }

    lastNavigatedSignature.current = signature
    hapticLightTap()
    openCard(latestStamp)
  }, [latestStamp, pathname, openCard])

  return null
}
