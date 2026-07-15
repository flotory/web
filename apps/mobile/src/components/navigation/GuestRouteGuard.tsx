import { useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'

import { guestRouteShouldRedirect } from '../../lib/guestRouteGuard'
import { useAuth } from '../../providers/AuthProvider'

/** Keeps logged-out users on guest-safe routes; allows venue landing `/v/[slug]`. */
export default function GuestRouteGuard() {
  const { token, booting } = useAuth()
  const segments = useSegments() as string[]
  const router = useRouter()

  useEffect(() => {
    if (booting || token) return

    if (guestRouteShouldRedirect(segments)) {
      router.replace('/(customer)/venues')
    }
  }, [booting, router, segments, token])

  return null
}
