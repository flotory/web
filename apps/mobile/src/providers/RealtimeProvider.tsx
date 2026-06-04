import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { fetchCustomerCardsList } from '../lib/customerData'
import { disconnectEcho, getEcho } from '../lib/realtime'
import type { RewardRedeemedPayload, StampAddedPayload } from '../types/realtime'
import { useAuth } from './AuthProvider'

interface RealtimeContextValue {
  latestStamp: StampAddedPayload | null
  latestRedeem: RewardRedeemedPayload | null
  clearLatestStamp: () => void
  clearLatestRedeem: () => void
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuth()
  const [latestStamp, setLatestStamp] = useState<StampAddedPayload | null>(null)
  const [latestRedeem, setLatestRedeem] = useState<RewardRedeemedPayload | null>(null)
  const subscribedIds = useRef<number[]>([])

  const clearLatestStamp = useCallback(() => setLatestStamp(null), [])
  const clearLatestRedeem = useCallback(() => setLatestRedeem(null), [])

  useEffect(() => {
    if (!token || role !== 'customer') {
      subscribedIds.current = []
      disconnectEcho()
      setLatestStamp(null)
      setLatestRedeem(null)
      return
    }

    let cancelled = false

    async function connect() {
      if (!token) {
        return
      }

      try {
        const sessionToken = token
        const echo = getEcho(sessionToken)
        const { cards } = await fetchCustomerCardsList(sessionToken)

        if (cancelled) {
          return
        }

        subscribedIds.current.forEach((id) => echo.leave(`customer.${id}`))
        subscribedIds.current = []

        cards.forEach((card) => {
          subscribedIds.current.push(card.id)
          echo
            .private(`customer.${card.id}`)
            .listen('.stamp.added', (payload: StampAddedPayload) => {
              setLatestStamp(payload)
            })
            .listen('.reward.redeemed', (payload: RewardRedeemedPayload) => {
              setLatestRedeem(payload)
            })
        })
      } catch {
        // Realtime is optional — polling still works on claim screen.
      }
    }

    void connect()

    return () => {
      cancelled = true
      if (token) {
        const echo = getEcho(token)
        subscribedIds.current.forEach((id) => echo.leave(`customer.${id}`))
      }
      subscribedIds.current = []
      disconnectEcho()
    }
  }, [token, role])

  const value = useMemo(
    () => ({
      latestStamp,
      latestRedeem,
      clearLatestStamp,
      clearLatestRedeem,
    }),
    [latestStamp, latestRedeem, clearLatestStamp, clearLatestRedeem],
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider')
  }
  return context
}
