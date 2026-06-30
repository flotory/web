import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { ApiError } from '../../src/lib/api'
import { hapticSuccess } from '../../src/lib/haptics'
import { completeNfcStampSuccess } from '../../src/lib/completeNfcStampSuccess'
import { fetchNfcTagPreview, submitNfcStamp } from '../../src/lib/nfcStamp'
import { withAppFont } from '../../src/lib/typography'
import { useAuth } from '../../src/providers/AuthProvider'
import { useRealtime } from '../../src/providers/RealtimeProvider'
import { colors, space } from '../../src/theme'

type ScreenState = 'loading' | 'ready' | 'stamping' | 'error'

async function completeStampSuccess(
  response: Parameters<typeof completeNfcStampSuccess>[0],
  authToken: string,
  ingestStamp: Parameters<typeof completeNfcStampSuccess>[2],
  router: ReturnType<typeof useRouter>,
  stampAddedTitle: string,
) {
  await completeNfcStampSuccess(response, authToken, ingestStamp, router, 'replace')
  void hapticSuccess()

  if (response.campaign_warning) {
    Alert.alert(stampAddedTitle, response.campaign_warning)
  }
}

export default function NfcTapScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string | string[] }>()
  const { token: authToken, booting } = useAuth()
  const { ingestStamp } = useRealtime()
  const resolvedToken = Array.isArray(token) ? token[0] : token

  const [screenState, setScreenState] = useState<ScreenState>('loading')
  const [venueName, setVenueName] = useState(t('common.venue'))
  const [stampToken, setStampToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const autoStampedRef = useRef(false)

  const loadPreview = useCallback(async () => {
    if (!resolvedToken) {
      setError(t('nfc.invalidLink'))
      setScreenState('error')
      return
    }

    try {
      const preview = await fetchNfcTagPreview(resolvedToken)
      setStampToken(preview.token)
      setVenueName(preview.venue?.name ?? t('common.venue'))
      setScreenState('ready')
    } catch (exception) {
      setStampToken(null)
      setError(exception instanceof ApiError ? exception.message : t('nfc.standUnavailable'))
      setScreenState('error')
    }
  }, [resolvedToken, t])

  const collectStamp = useCallback(async () => {
    const tokenForStamp = stampToken ?? resolvedToken
    if (!tokenForStamp || !authToken) return

    setScreenState('stamping')
    setError('')

    try {
      const response = await submitNfcStamp(tokenForStamp, authToken)
      await completeStampSuccess(response, authToken, ingestStamp, router, t('nfc.stampAdded'))
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : t('nfc.addError'))
      setScreenState('error')
    }
  }, [authToken, ingestStamp, resolvedToken, router, stampToken, t])

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
          {t('nfc.stampTitle')}
        </Text>
        <Text style={withAppFont({ fontSize: 28, fontWeight: '800', color: colors.ink })}>{venueName}</Text>

        {screenState === 'loading' || screenState === 'stamping' ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={withAppFont({ marginTop: 12, color: colors.inkMuted, fontWeight: '600' })}>
              {screenState === 'stamping' ? t('nfc.adding') : t('nfc.loading')}
            </Text>
          </View>
        ) : null}

        {screenState === 'error' ? (
          <View style={{ gap: 12 }}>
            <Text style={withAppFont({ color: colors.danger, fontWeight: '700' })}>{error}</Text>
            <PrimaryButton label={t('venues.tryAgain')} onPress={() => router.replace('/(customer)/qr')} />
            <Pressable onPress={() => router.replace('/(customer)/wallet')} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={withAppFont({ color: colors.inkMuted, fontWeight: '700' })}>{t('venues.openWallet')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScreenGradientLayout>
  )
}
