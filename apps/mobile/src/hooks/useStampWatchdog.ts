import { usePathname } from 'expo-router'
import NetInfo from '@react-native-community/netinfo'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { buildStampPayloadFromCardDetail } from '../lib/buildStampPayload'
import { fetchCardDetail, fetchCustomerCardsList, invalidateCustomerCardsList } from '../lib/customerData'
import { applyStampBaselines, syncStampBaseline } from '../lib/stampAck'
import { useAuth } from '../providers/AuthProvider'
import { useRealtime } from '../providers/RealtimeProvider'
import type { WalletCard } from '../types/loyalty'

const POLL_MS = 2000
const POLL_MS_ACTIVE = 900
const FAILURE_BACKOFF_MS = [0, 3000, 8000, 15000, 30000] as const

export type StampWatchdogStatus = 'ok' | 'offline' | 'delayed'

function isQrScreen(pathname: string): boolean {
  return pathname.includes('/qr')
}

function isHomeScreen(pathname: string): boolean {
  return pathname.includes('/home')
}

function isCardScreen(pathname: string): boolean {
  return pathname.includes('/card/')
}

function usesFastStampPoll(pathname: string): boolean {
  return isQrScreen(pathname) || isHomeScreen(pathname) || isCardScreen(pathname)
}

async function detectStampChanges(
  cards: WalletCard[],
  baseline: Map<number, number>,
  token: string,
  ingestStamp: (payload: ReturnType<typeof buildStampPayloadFromCardDetail>) => void,
): Promise<void> {
  applyStampBaselines(baseline, cards)

  for (const card of cards) {
    const previous = baseline.get(card.id)
    const isNewCard = previous === undefined

    if (!isNewCard && card.stamps === previous) {
      continue
    }

    const previousStamps = isNewCard ? 0 : previous

    if (card.stamps > previousStamps) {
      const detail = await fetchCardDetail(token, String(card.venue_id), true)
      const payload = buildStampPayloadFromCardDetail(previousStamps, detail)

      if (payload) {
        invalidateCustomerCardsList(token)
        ingestStamp(payload)
      }
    }

    baseline.set(card.id, card.stamps)
    syncStampBaseline(card.id, card.stamps)
  }
}

export function useStampWatchdog() {
  const pathname = usePathname()
  const { token, role } = useAuth()
  const { ingestStamp } = useRealtime()
  const [status, setStatus] = useState<StampWatchdogStatus>('ok')
  const stampSnapshot = useRef<Map<number, number>>(new Map())
  const activeBaseline = useRef<Map<number, number>>(new Map())
  const activeBaselineReady = useRef(false)
  const globalBootstrapped = useRef(false)
  const failureCount = useRef(0)
  const backoffUntil = useRef(0)
  const fastPoll = usesFastStampPoll(pathname)

  const poll = useCallback(async () => {
    if (AppState.currentState !== 'active' || !token || role !== 'customer') {
      return
    }

    if (Date.now() < backoffUntil.current) {
      return
    }

    try {
      const network = await NetInfo.fetch()
      if (network.isConnected === false) {
        setStatus('offline')
        return
      }

      const { cards } = await fetchCustomerCardsList(token, true)

      if (fastPoll) {
        if (!activeBaselineReady.current) {
          activeBaseline.current = new Map(cards.map((card) => [card.id, card.stamps]))
          cards.forEach((card) => syncStampBaseline(card.id, card.stamps))
          activeBaselineReady.current = true
          failureCount.current = 0
          backoffUntil.current = 0
          setStatus('ok')
          return
        }

        await detectStampChanges(cards, activeBaseline.current, token, (payload) => {
          if (payload) ingestStamp(payload)
        })
        failureCount.current = 0
        backoffUntil.current = 0
        setStatus('ok')
        return
      }

      activeBaselineReady.current = false

      if (!globalBootstrapped.current) {
        for (const card of cards) {
          stampSnapshot.current.set(card.id, card.stamps)
          syncStampBaseline(card.id, card.stamps)
        }
        globalBootstrapped.current = true
        failureCount.current = 0
        backoffUntil.current = 0
        setStatus('ok')
        return
      }

      await detectStampChanges(cards, stampSnapshot.current, token, (payload) => {
        if (payload) ingestStamp(payload)
      })
      failureCount.current = 0
      backoffUntil.current = 0
      setStatus('ok')
    } catch {
      failureCount.current += 1
      const backoff = FAILURE_BACKOFF_MS[Math.min(failureCount.current, FAILURE_BACKOFF_MS.length - 1)] ?? 30000
      backoffUntil.current = Date.now() + backoff
      if (failureCount.current >= 2) {
        setStatus('delayed')
      }
    }
  }, [token, role, ingestStamp, fastPoll])

  useEffect(() => {
    if (!token || role !== 'customer') {
      stampSnapshot.current.clear()
      activeBaseline.current.clear()
      globalBootstrapped.current = false
      activeBaselineReady.current = false
      failureCount.current = 0
      backoffUntil.current = 0
      setStatus('ok')
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null
    let bootstrapTimer: ReturnType<typeof setTimeout> | null = null

    const run = () => {
      if (!cancelled) {
        void poll()
      }
    }

    if (fastPoll) {
      activeBaselineReady.current = false
    }

    run()

    if (!globalBootstrapped.current && !fastPoll) {
      bootstrapTimer = setTimeout(run, 400)
    }

    timer = setInterval(run, fastPoll ? POLL_MS_ACTIVE : POLL_MS)

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (fastPoll) {
          activeBaselineReady.current = false
        }
        run()
      }
    })

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      if (bootstrapTimer) clearTimeout(bootstrapTimer)
      subscription.remove()
    }
  }, [token, role, poll, fastPoll])

  return { status }
}
