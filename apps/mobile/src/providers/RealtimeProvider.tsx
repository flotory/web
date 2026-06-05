import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { fetchCustomerCardsList } from '../lib/customerData'
import { stampUpdateSignature } from '../lib/stampLiveUpdate'
import { disconnectEcho, getEcho } from '../lib/realtime'
import type { RewardRedeemedPayload, StampAddedPayload } from '../types/realtime'
import type { WalletCard } from '../types/loyalty'
import { useAuth } from './AuthProvider'

interface RealtimeContextValue {
  latestStamp: StampAddedPayload | null
  latestRedeem: RewardRedeemedPayload | null
  clearLatestStamp: () => void
  clearLatestRedeem: () => void
  ingestStamp: (payload: StampAddedPayload) => void
  syncChannels: (cards?: WalletCard[]) => Promise<void>
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuth()
  const [latestStamp, setLatestStamp] = useState<StampAddedPayload | null>(null)
  const [latestRedeem, setLatestRedeem] = useState<RewardRedeemedPayload | null>(null)
  const subscribedIds = useRef<Set<number>>(new Set())
  const echoRef = useRef<ReturnType<typeof getEcho> | null>(null)
  const lastStampSignature = useRef('')

  const clearLatestStamp = useCallback(() => setLatestStamp(null), [])
  const clearLatestRedeem = useCallback(() => setLatestRedeem(null), [])
  const publishStamp = useCallback((payload: StampAddedPayload) => {
    const signature = stampUpdateSignature(payload)
    if (lastStampSignature.current === signature) {
      return
    }

    lastStampSignature.current = signature
    setLatestStamp(payload)
  }, [])
  const ingestStamp = publishStamp

  const bindChannel = useCallback((cardId: number) => {
    if (!token || subscribedIds.current.has(cardId) || !echoRef.current) {
      return
    }

    subscribedIds.current.add(cardId)
    echoRef.current
      .private(`customer.${cardId}`)
      .listen('.stamp.added', (payload: StampAddedPayload) => {
        publishStamp(payload)
      })
      .listen('.reward.redeemed', (payload: RewardRedeemedPayload) => {
        setLatestRedeem(payload)
      })
  }, [token, publishStamp])

  const syncChannels = useCallback(async (knownCards?: WalletCard[]) => {
    if (!token || role !== 'customer') {
      return
    }

    try {
      const echo = getEcho(token)
      echoRef.current = echo
      const cards = knownCards ?? (await fetchCustomerCardsList(token, true)).cards
      cards.forEach((card) => bindChannel(card.id))
    } catch {
      // Realtime is optional — polling still updates the UI.
    }
  }, [token, role, bindChannel])

  useEffect(() => {
    if (!token || role !== 'customer') {
      subscribedIds.current.clear()
      echoRef.current = null
      disconnectEcho()
      setLatestStamp(null)
      setLatestRedeem(null)
      lastStampSignature.current = ''
      return
    }

    subscribedIds.current.clear()
    lastStampSignature.current = ''
    void syncChannels()

    return () => {
      subscribedIds.current.clear()
      echoRef.current = null
      disconnectEcho()
    }
  }, [token, role, syncChannels])

  const value = useMemo(
    () => ({
      latestStamp,
      latestRedeem,
      clearLatestStamp,
      clearLatestRedeem,
      ingestStamp,
      syncChannels,
    }),
    [latestStamp, latestRedeem, clearLatestStamp, clearLatestRedeem, ingestStamp, syncChannels],
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
