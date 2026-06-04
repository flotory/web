import { usePathname, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { View } from 'react-native'

import StampScannedBanner from './StampScannedBanner'
import { useStampWatchdog } from '../../hooks/useStampWatchdog'
import { hapticLightTap } from '../../lib/haptics'
import { stampBannerCopy, stampUpdateSignature } from '../../lib/stampLiveUpdate'
import { useRealtime } from '../../providers/RealtimeProvider'
import type { StampAddedPayload } from '../../types/realtime'

function isOnCardScreen(pathname: string, cardId: number): boolean {
  const match = pathname.match(/\/card\/(\d+)/)
  return match !== null && Number(match[1]) === cardId
}

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

  const showTransitBanner = Boolean(
    latestStamp && !isOnCardScreen(pathname, latestStamp.customer.id),
  )
  const bannerCopy = latestStamp && showTransitBanner ? stampBannerCopy(latestStamp) : null

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 100 }}>
      <StampScannedBanner
        visible={showTransitBanner && Boolean(bannerCopy)}
        title={bannerCopy?.title ?? ''}
        subtitle={bannerCopy?.subtitle}
        onDismiss={() => undefined}
        autoHideMs={1400}
      />
    </View>
  )
}
