import { useEffect, useRef } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import NfcStampStatusBanner from '../../src/components/customer/NfcStampStatusBanner'
import QrImage from '../../src/components/QrImage'
import CustomerScreen from '../../src/components/ui/CustomerScreen'
import StateCard from '../../src/components/ui/StateCard'
import { useNfcStampScan } from '../../src/hooks/useNfcStampScan'
import { useStampQr } from '../../src/hooks/useStampQr'
import { hapticSuccess } from '../../src/lib/haptics'
import { withAppFont } from '../../src/lib/typography'
import { colors, radius, shadows, space, tabBar, type as typography } from '../../src/theme'

/** Matches `(customer)/_layout.tsx` tab bar height */
const TAB_BAR_HEIGHT = tabBar.height

export default function CustomerQrScreen() {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const { data, loading, error, reload } = useStampQr({ refetchOnFocus: true })
  const { phase, error: nfcError, pauseScan, retryScan } = useNfcStampScan({ enabled: true })

  /** Lift QR above geometric center — tab bar makes true center feel too low */
  const qrLift = Math.round(Math.min(72, Math.max(28, windowHeight * 0.06)))
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
      flexContent
      tabBarInset
      header={
        <View
          style={{
            paddingHorizontal: space.screenX,
            paddingTop: insets.top > 0 ? 0 : 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ ...typography.section, textAlign: 'center' }}>Collect a stamp</Text>
          <Text style={{ ...typography.body, marginTop: 6, color: colors.inkMuted, textAlign: 'center' }}>
            Hold near the NFC stand, or show your QR for staff to scan.
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
        <View
          style={{
            flex: 1,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: space.screenX,
            paddingBottom: TAB_BAR_HEIGHT + insets.bottom,
            marginTop: -qrLift,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 320,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.card,
                padding: space.cardPad + 6,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                alignSelf: 'center',
                ...shadows.md,
              }}
            >
              <QrImage value={data.qr_value} size={260} />
            </View>
            <Text style={withAppFont({ marginTop: 20, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.ink })}>
              One QR for all your venues
            </Text>
            <Text style={{ ...typography.caption, marginTop: 8, textAlign: 'center', color: colors.inkMuted }}>
              Staff scan here — stamps go to this visit's venue. New venues join automatically on first scan.
            </Text>
            <NfcStampStatusBanner
              phase={phase}
              error={nfcError}
              onRetry={retryScan}
              onPause={() => void pauseScan()}
            />
          </View>
        </View>
      ) : !error && !loading ? (
        <View style={{ padding: space.screenX }}>
          <StateCard emoji="📱" title="Sign in required" message="Log in to show your stamp QR." />
        </View>
      ) : null}
    </CustomerScreen>
  )
}
