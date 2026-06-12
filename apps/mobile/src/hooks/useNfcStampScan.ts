import { useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { Alert } from 'react-native'

import { ApiError } from '../lib/api'
import { hapticSuccess } from '../lib/haptics'
import {
  ensureNfcSessionReady,
  isNfcHardwareSupported,
  nfcLog,
  readFlotoryNfcToken,
} from '../lib/nfcReader'
import { completeNfcStampSuccess } from '../lib/completeNfcStampSuccess'
import { submitNfcStamp } from '../lib/nfcStamp'
import { useAuth } from '../providers/AuthProvider'
import { useRealtime } from '../providers/RealtimeProvider'

function isUserCancelled(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('cancel') || lower.includes('invalidated')
}

export function useNfcStampScan() {
  const router = useRouter()
  const { token: authToken } = useAuth()
  const { ingestStamp } = useRealtime()
  const [scanning, setScanning] = useState(false)
  const scanningRef = useRef(false)

  const startScan = useCallback(async () => {
    if (scanningRef.current) {
      nfcLog('useNfcStampScan.startScan: skipped — already scanning')
      return
    }

    scanningRef.current = true
    setScanning(true)
    nfcLog('useNfcStampScan.startScan: start')

    try {
      const supported = await isNfcHardwareSupported()
      if (!supported) {
        Alert.alert(
          'NFC unavailable',
          'In-app NFC needs a native iOS build from Xcode. You can still tap the physical stand to open Flotory.',
        )
        return
      }

      if (!authToken) {
        Alert.alert('Sign in required', 'Log in to collect stamps with NFC.')
        return
      }

      await ensureNfcSessionReady()
      const nfcToken = await readFlotoryNfcToken()
      nfcLog('useNfcStampScan.startScan: token ready', {
        token: `${nfcToken.slice(0, 4)}…${nfcToken.slice(-4)}`,
      })

      const response = await submitNfcStamp(nfcToken, authToken)
      await completeNfcStampSuccess(response, authToken, ingestStamp, router)
      void hapticSuccess()

      if (response.campaign_warning) {
        Alert.alert('Stamp added', response.campaign_warning)
      }
    } catch (exception) {
      const message =
        exception instanceof ApiError
          ? exception.message
          : exception instanceof Error && exception.message.trim()
            ? exception.message
            : 'Could not collect a stamp. Try again.'

      nfcLog('useNfcStampScan.startScan: error', {
        message,
        raw: exception instanceof Error ? { name: exception.name, message: exception.message } : exception,
      })

      if (!isUserCancelled(message)) {
        Alert.alert('Could not collect stamp', message)
      }
    } finally {
      scanningRef.current = false
      setScanning(false)
    }
  }, [authToken, ingestStamp, router])

  return { startScan, scanning }
}
