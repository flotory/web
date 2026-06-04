import { usePathname } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'

import { buildStampPayloadFromCardDetail } from '../lib/buildStampPayload'
import { fetchCardDetail, fetchCustomerCardsList, invalidateCustomerCardsList } from '../lib/customerData'
import { useAuth } from '../providers/AuthProvider'
import { useRealtime } from '../providers/RealtimeProvider'
import type { WalletCard } from '../types/loyalty'

const POLL_MS = 2000
const POLL_MS_ACTIVE = 900

function isQrScreen(pathname: string): boolean {
  return pathname.includes('/qr')
}

function isHomeScreen(pathname: string): boolean {
  return pathname.includes('/home')
}

function usesFastStampPoll(pathname: string): boolean {
  return isQrScreen(pathname) || isHomeScreen(pathname)
}

async function detectStampIncreases(
  cards: WalletCard[],
  baseline: Map<number, number>,
  token: string,
  ingestStamp: (payload: ReturnType<typeof buildStampPayloadFromCardDetail>) => void,
): Promise<void> {
  for (const card of cards) {
    const previous = baseline.get(card.id)
    const isNewCard = previous === undefined
    const previousStamps = isNewCard ? 0 : previous

    baseline.set(card.id, card.stamps)

    if (!isNewCard && card.stamps === previous) {
      continue
    }

    if (card.stamps <= previousStamps) {
      continue
    }

    const detail = await fetchCardDetail(token, String(card.venue_id), true)
    const payload = buildStampPayloadFromCardDetail(previousStamps, detail)

    if (payload) {
      invalidateCustomerCardsList(token)
      ingestStamp(payload)
    }
  }
}

export function useStampWatchdog() {
  const pathname = usePathname()
  const { token, role } = useAuth()
  const { ingestStamp, syncChannels } = useRealtime()
  const stampSnapshot = useRef<Map<number, number>>(new Map())
  const activeBaseline = useRef<Map<number, number>>(new Map())
  const activeBaselineReady = useRef(false)
  const globalBootstrapped = useRef(false)
  const fastPoll = usesFastStampPoll(pathname)

  const poll = useCallback(async () => {
    if (AppState.currentState !== 'active' || !token || role !== 'customer') {
      return
    }

    try {
      const { cards } = await fetchCustomerCardsList(token, true)
      await syncChannels()

      if (fastPoll) {
        if (!activeBaselineReady.current) {
          activeBaseline.current = new Map(cards.map((card) => [card.id, card.stamps]))
          activeBaselineReady.current = true
          return
        }

        await detectStampIncreases(cards, activeBaseline.current, token, (payload) => {
          if (payload) ingestStamp(payload)
        })
        return
      }

      activeBaselineReady.current = false

      if (!globalBootstrapped.current) {
        for (const card of cards) {
          stampSnapshot.current.set(card.id, card.stamps)
        }
        globalBootstrapped.current = true
        return
      }

      await detectStampIncreases(cards, stampSnapshot.current, token, (payload) => {
        if (payload) ingestStamp(payload)
      })
    } catch {
      // Polling is a fallback when WebSockets are unavailable.
    }
  }, [token, role, ingestStamp, syncChannels, fastPoll])

  useEffect(() => {
    if (!token || role !== 'customer') {
      stampSnapshot.current.clear()
      activeBaseline.current.clear()
      globalBootstrapped.current = false
      activeBaselineReady.current = false
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
}
