import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import NfcStampSuccess from '../../src/components/customer/NfcStampSuccess'
import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { ApiError } from '../../src/lib/api'
import { fetchNfcTagPreview, submitNfcStamp, type NfcStampResponse } from '../../src/lib/nfcStamp'
import { hapticSuccess } from '../../src/lib/haptics'
import { withAppFont } from '../../src/lib/typography'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, space } from '../../src/theme'

type ScreenState = 'loading' | 'ready' | 'stamping' | 'success' | 'error'

export default function NfcTapScreen() {
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string | string[] }>()
  const { token: authToken, booting } = useAuth()
  const resolvedToken = Array.isArray(token) ? token[0] : token

  const [screenState, setScreenState] = useState<ScreenState>('loading')
  const [venueName, setVenueName] = useState('Venue')
  const [result, setResult] = useState<NfcStampResponse | null>(null)
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
      setVenueName(preview.venue?.name ?? 'Venue')
      setScreenState('ready')
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'This NFC stand is unavailable.')
      setScreenState('error')
    }
  }, [resolvedToken])

  const collectStamp = useCallback(async () => {
    if (!resolvedToken || !authToken) return

    setScreenState('stamping')
    setError('')

    try {
      const response = await submitNfcStamp(resolvedToken, authToken)
      setResult(response)
      setScreenState('success')
      void hapticSuccess()
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Could not add a stamp right now.')
      setScreenState('error')
    }
  }, [authToken, resolvedToken])

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

        {screenState === 'success' && result ? (
          <View style={{ gap: 12 }}>
            <NfcStampSuccess subtitle={result.message} />
            <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
              <Text style={withAppFont({ fontSize: 15, fontWeight: '700', color: colors.inkMuted })}>Your progress</Text>
              <Text style={withAppFont({ marginTop: 6, fontSize: 28, fontWeight: '800', color: colors.ink })}>
                {result.stamps} stamps
              </Text>
              {result.next_reward ? (
                <Text style={withAppFont({ marginTop: 4, fontSize: 14, fontWeight: '600', color: colors.inkMuted })}>
                  Next: {result.next_reward.title}
                </Text>
              ) : null}
            </View>
            <PrimaryButton label="Tap again for another stamp" onPress={() => void collectStamp()} />
            <Pressable onPress={() => router.replace('/(customer)/wallet')} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={withAppFont({ color: colors.inkMuted, fontWeight: '700' })}>Open wallet</Text>
            </Pressable>
          </View>
        ) : null}

        {screenState === 'error' ? (
          <View style={{ gap: 12 }}>
            <Text style={withAppFont({ color: colors.danger, fontWeight: '700' })}>{error}</Text>
            <PrimaryButton label="Try again" onPress={() => { autoStampedRef.current = false; void loadPreview().then(() => void collectStamp()) }} />
          </View>
        ) : null}
      </View>
    </ScreenGradientLayout>
  )
}
