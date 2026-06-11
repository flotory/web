import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { ApiError } from '../../src/lib/api'
import { hapticSuccess } from '../../src/lib/haptics'
import { fetchNfcTagPreview, submitNfcStamp, type NfcStampResponse } from '../../src/lib/nfcStamp'
import { cardRouteFromNfcStamp, nfcResponseToStampPayload } from '../../src/lib/stampLiveUpdate'
import { withAppFont } from '../../src/lib/typography'
import { useAuth } from '../../src/providers/AuthProvider'
import { useRealtime } from '../../src/providers/RealtimeProvider'
import { colors, space } from '../../src/theme'

type ScreenState = 'loading' | 'ready' | 'stamping' | 'error'

function completeStampSuccess(
  response: NfcStampResponse,
  ingestStamp: (payload: ReturnType<typeof nfcResponseToStampPayload>) => void,
  router: ReturnType<typeof useRouter>,
) {
  const payload = nfcResponseToStampPayload(response)
  ingestStamp(payload)
  void hapticSuccess()
  router.replace(cardRouteFromNfcStamp(response))
}

export default function NfcTapScreen() {
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string | string[] }>()
  const { token: authToken, booting } = useAuth()
  const { ingestStamp } = useRealtime()
  const resolvedToken = Array.isArray(token) ? token[0] : token

  const [screenState, setScreenState] = useState<ScreenState>('loading')
  const [venueName, setVenueName] = useState('Venue')
  const [stampToken, setStampToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const autoStampedRef = useRef(false)

  const loadPreview = useCallback(async () => {
    if (!resolvedToken) {
      setError('Invalid NFC link.')
      setScreenState('error')
      return
    }

    try {
      const preview = await fetchNfcTagPreview(resolvedToken)
      setStampToken(preview.token)
      setVenueName(preview.venue?.name ?? 'Venue')
      setScreenState('ready')
    } catch (exception) {
      setStampToken(null)
      setError(exception instanceof ApiError ? exception.message : 'This NFC stand is unavailable.')
      setScreenState('error')
    }
  }, [resolvedToken])

  const collectStamp = useCallback(async () => {
    const tokenForStamp = stampToken ?? resolvedToken
    if (!tokenForStamp || !authToken) return

    setScreenState('stamping')
    setError('')

    try {
      const response = await submitNfcStamp(tokenForStamp, authToken)
      completeStampSuccess(response, ingestStamp, router)
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Could not add a stamp right now.')
      setScreenState('error')
    }
  }, [authToken, ingestStamp, resolvedToken, router, stampToken])

  useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  useEffect(() => {
    if (!authToken || screenState !== 'ready' || autoStampedRef.current) {
      return
    }

    autoStampedRef.current = true
    void collectStamp()
  }, [authToken, collectStamp, screenState])

  if (booting) {
    return null
  }

  if (!authToken && resolvedToken) {
    return <Redirect href={`/login?redirect=${encodeURIComponent(`/t/${resolvedToken}`)}`} />
  }

  return (
    <ScreenGradientLayout scrollable tabBarInset={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.screenX }}>
      <View style={{ gap: 16 }}>
        <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 1.1 })}>
          NFC stamp
        </Text>
        <Text style={withAppFont({ fontSize: 28, fontWeight: '800', color: colors.ink })}>{venueName}</Text>

        {screenState === 'loading' || screenState === 'stamping' ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={withAppFont({ marginTop: 12, color: colors.inkMuted, fontWeight: '600' })}>
              {screenState === 'stamping' ? 'Adding your stamp…' : 'Loading stand…'}
            </Text>
          </View>
        ) : null}

        {screenState === 'error' ? (
          <View style={{ gap: 12 }}>
            <Text style={withAppFont({ color: colors.danger, fontWeight: '700' })}>{error}</Text>
            <PrimaryButton label="Try again" onPress={() => router.replace('/(customer)/qr')} />
            <Pressable onPress={() => router.replace('/(customer)/wallet')} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={withAppFont({ color: colors.inkMuted, fontWeight: '700' })}>Open wallet</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScreenGradientLayout>
  )
}
