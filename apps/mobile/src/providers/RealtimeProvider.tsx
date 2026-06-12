import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { clearStampAckState, syncStampBaseline } from '../lib/stampAck'
import { decideStampPublish } from '../lib/stampRealtime'
import type { StampAddedPayload } from '../types/realtime'
import { useAuth } from './AuthProvider'

interface RealtimeContextValue {
  latestStamp: StampAddedPayload | null
  clearLatestStamp: () => void
  ingestStamp: (payload: StampAddedPayload) => void
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined)

/** In-memory stamp sync bus — fed by NFC responses and polling, not WebSockets. */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuth()
  const [latestStamp, setLatestStamp] = useState<StampAddedPayload | null>(null)
  const lastStampSignature = useRef('')

  const clearLatestStamp = useCallback(() => setLatestStamp(null), [])

  const ingestStamp = useCallback((payload: StampAddedPayload) => {
    const decision = decideStampPublish(payload, lastStampSignature.current)
    if (!decision.publish) {
      return
    }

    lastStampSignature.current = decision.signature
    syncStampBaseline(payload.customer.id, payload.stamps)
    setLatestStamp(payload)
  }, [])

  useEffect(() => {
    if (!token || role !== 'customer') {
      setLatestStamp(null)
      lastStampSignature.current = ''
      clearStampAckState()
    }
  }, [token, role])

  const value = useMemo(
    () => ({
      latestStamp,
      clearLatestStamp,
      ingestStamp,
    }),
    [latestStamp, clearLatestStamp, ingestStamp],
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
