import { useIsFocused, useNavigation } from '@react-navigation/native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cancelNfcScan, isNfcHardwareSupported, nfcLog, readFlotoryNfcToken } from '../lib/nfcReader'

function nfcScanErrorMessage(exception: unknown): string {
  if (exception instanceof Error && exception.message.trim()) {
    return exception.message
  }

  return 'NFC scan cancelled. Tap the center button to try again.'
}

export type NfcStampScanPhase = 'idle' | 'checking' | 'scanning' | 'error' | 'unsupported'

function isNfcScannerInactive(phase: NfcStampScanPhase): boolean {
  return phase === 'idle' || phase === 'error'
}

interface UseNfcStampScanOptions {
  enabled: boolean
}

export function useNfcStampScan({ enabled }: UseNfcStampScanOptions) {
  const router = useRouter()
  const navigation = useNavigation()
  const isFocused = useIsFocused()
  const [phase, setPhase] = useState<NfcStampScanPhase>('idle')
  const [error, setError] = useState('')
  const scanningRef = useRef(false)
  const pausedRef = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const runScan = useCallback(async () => {
    if (!enabled || scanningRef.current || pausedRef.current) {
      nfcLog('useNfcStampScan.runScan: skipped', {
        enabled,
        scanning: scanningRef.current,
        paused: pausedRef.current,
      })
      return
    }

    nfcLog('useNfcStampScan.runScan: start')
    scanningRef.current = true
    setError('')
    setPhase('checking')

    try {
      const supported = await isNfcHardwareSupported()
      if (!supported) {
        nfcLog('useNfcStampScan.runScan: unsupported device')
        setPhase('unsupported')
        return
      }

      setPhase('scanning')
      const nfcToken = await readFlotoryNfcToken()
      nfcLog('useNfcStampScan.runScan: navigating to stamp screen', {
        token: `${nfcToken.slice(0, 4)}…${nfcToken.slice(-4)}`,
      })
      router.push(`/t/${encodeURIComponent(nfcToken)}`)
    } catch (exception) {
      const message = nfcScanErrorMessage(exception)
      nfcLog('useNfcStampScan.runScan: error', {
        message,
        raw: exception instanceof Error ? { name: exception.name, message: exception.message } : exception,
      })
      setError(message)
      setPhase('error')
      pausedRef.current = true
    } finally {
      scanningRef.current = false
    }
  }, [enabled, router])

  const pauseScan = useCallback(async () => {
    nfcLog('useNfcStampScan.pauseScan')
    await cancelNfcScan()
    scanningRef.current = false
    pausedRef.current = true
    setPhase('idle')
    setError('')
  }, [])

  const startScanIfInactive = useCallback(() => {
    if (!isNfcScannerInactive(phaseRef.current)) {
      return
    }

    pausedRef.current = false
    setError('')
    void runScan()
  }, [runScan])

  const retryScan = useCallback(() => {
    startScanIfInactive()
  }, [startScanIfInactive])

  useFocusEffect(
    useCallback(() => {
      nfcLog('useNfcStampScan: screen focused')
      pausedRef.current = false
      setPhase('idle')
      setError('')

      const focusTimer = setTimeout(() => {
        nfcLog('useNfcStampScan: starting scan after focus delay')
        void runScan()
      }, 400)

      return () => {
        clearTimeout(focusTimer)
        nfcLog('useNfcStampScan: screen blurred', {
          phase: phaseRef.current,
          scanning: scanningRef.current,
        })
        // iOS NFC sheet can blur this screen — never cancel an in-flight read here.
        if (!scanningRef.current) {
          void cancelNfcScan()
        }
      }
    }, [runScan]),
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    const unsubscribe = navigation.addListener('tabPress', () => {
      nfcLog('useNfcStampScan: tabPress', {
        isFocused,
        phase: phaseRef.current,
      })
      if (!isFocused || !isNfcScannerInactive(phaseRef.current)) {
        return
      }

      startScanIfInactive()
    })

    return unsubscribe
  }, [enabled, isFocused, navigation, startScanIfInactive])

  return {
    phase,
    error,
    pauseScan,
    retryScan,
    runScan,
  }
}
