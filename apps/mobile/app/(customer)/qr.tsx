import { useEffect, useRef } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import QrImage from '../../src/components/QrImage'
import CustomerScreen from '../../src/components/ui/CustomerScreen'
import StateCard from '../../src/components/ui/StateCard'
import { useStampQr } from '../../src/hooks/useStampQr'
import { hapticSuccess } from '../../src/lib/haptics'
import { colors, radius, space, type as typography } from '../../src/theme'

export default function CustomerQrScreen() {
  const insets = useSafeAreaInsets()
  const { data, loading, error, reload } = useStampQr({ refetchOnFocus: true })
  const readyHapticDone = useRef(false)

  useEffect(() => {
    if (!data?.qr_value || readyHapticDone.current) return
    readyHapticDone.current = true
    hapticSuccess()
  }, [data?.qr_value])

  return (
    <CustomerScreen
      loading={loading && !data}
      scrollable={false}
      tabBarInset
      header={
        <View style={{ paddingHorizontal: space.screenX, paddingTop: insets.top > 0 ? 0 : 8 }}>
          <Text style={typography.section}>My QR</Text>
          <Text style={{ ...typography.body, marginTop: 6, color: colors.inkMuted }}>
            Show this at the counter — staff will stamp your card for this visit.
          </Text>
        </View>
      }
      errorState={
        error
          ? {
              title: 'Could not load your QR',
              message: error,
              primaryLabel: 'Try again',
              onPrimary: reload,
            }
          : undefined
      }
    >
      {!error && data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.screenX }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: space.cardPad,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <QrImage value={data.qr_value} size={260} />
          </View>
          <Text style={{ marginTop: 20, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.ink }}>
            One QR for all your venues
          </Text>
          <Text style={{ ...typography.caption, marginTop: 8, textAlign: 'center', color: colors.inkMuted }}>
            Staff scan here — stamps go to this visit's venue. New venues join automatically on first scan.
          </Text>
        </View>
      ) : !error && !loading ? (
        <View style={{ padding: space.screenX }}>
          <StateCard emoji="📱" title="Sign in required" message="Log in to show your stamp QR." />
        </View>
      ) : null}
    </CustomerScreen>
  )
}
