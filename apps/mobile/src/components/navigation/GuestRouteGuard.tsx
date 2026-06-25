import { useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'

import { useAuth } from '../../providers/AuthProvider'

/** Keeps logged-out users on the guest Venues tab after sign-out or deep links. */
export default function GuestRouteGuard() {
  const { token, booting } = useAuth()
  const segments = useSegments() as string[]
  const router = useRouter()

  useEffect(() => {
    if (booting || token) return

    const tab = segments[1]
    if (tab && tab !== 'venues') {
      router.replace('/(customer)/venues')
    }
  }, [booting, router, segments, token])

  return null
}
