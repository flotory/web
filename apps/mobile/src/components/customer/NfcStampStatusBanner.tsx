import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps, ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import type { NfcStampScanPhase } from '../../hooks/useNfcStampScan'
import { hapticLightTap } from '../../lib/haptics'
import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'
import PrimaryButton from '../ui/PrimaryButton'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface NfcStampStatusBannerProps {
  phase: NfcStampScanPhase
  error: string
  onRetry: () => void
  onPause: () => void
}

function NfcSecondaryButton({
  label,
  icon,
  onPress,
}: {
  label: string
  icon?: IoniconName
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        hapticLightTap()
        onPress()
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 11,
        paddingHorizontal: 18,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.inkMuted} /> : null}
      <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.inkMuted })}>{label}</Text>
    </Pressable>
  )
}

function NfcActionCard({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'active' | 'paused'
}) {
  const backgroundColor =
    tone === 'active' ? colors.accentSoft : tone === 'paused' ? colors.lavender : colors.surfaceMuted

  return (
    <View
      style={{
        marginTop: 16,
        width: '100%',
        padding: space.cardPad,
        borderRadius: radius.card,
        backgroundColor,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
        ...shadows.sm,
      }}
    >
      {children}
    </View>
  )
}

export default function NfcStampStatusBanner({ phase, error, onRetry, onPause }: NfcStampStatusBannerProps) {
  if (phase === 'unsupported') {
    return (
      <NfcActionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.inkMuted} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={withAppFont({ fontSize: 14, fontWeight: '800', color: colors.ink })}>NFC stand</Text>
            <Text style={withAppFont({ fontSize: 13, lineHeight: 19, color: colors.inkMuted })}>
              In-app NFC needs a native iPhone build. You can still tap the physical stand with your phone unlocked.
            </Text>
          </View>
        </View>
      </NfcActionCard>
    )
  }

  if (phase === 'idle') {
    return (
      <View style={{ marginTop: 16, width: '100%' }}>
        <PrimaryButton label="Tap NFC stand" icon="radio-outline" onPress={onRetry} pulse />
      </View>
    )
  }

  if (phase === 'error') {
    return (
      <NfcActionCard tone="paused">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="radio-outline" size={22} color={colors.accentActive} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={withAppFont({ fontSize: 14, fontWeight: '800', color: colors.ink })}>Ready when you are</Text>
            <Text style={withAppFont({ fontSize: 13, lineHeight: 19, color: colors.inkMuted })}>
              {error || 'Show your QR to staff, or tap below to scan the NFC stand again.'}
            </Text>
          </View>
        </View>
        <PrimaryButton label="Tap NFC stand" icon="radio-outline" onPress={onRetry} />
      </NfcActionCard>
    )
  }

  return (
    <NfcActionCard tone="active">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {phase === 'checking' ? (
            <ActivityIndicator color={colors.accentActive} size="small" />
          ) : (
            <Ionicons name="radio-outline" size={22} color={colors.accentActive} />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={withAppFont({ fontSize: 15, fontWeight: '800', color: colors.ink })}>
            {phase === 'checking' ? 'Starting NFC…' : 'Hold near the NFC stand'}
          </Text>
          <Text style={withAppFont({ fontSize: 13, lineHeight: 18, color: colors.inkMuted })}>
            Your QR stays visible for staff. Cancel the NFC prompt to use QR only.
          </Text>
        </View>
      </View>
      <NfcSecondaryButton label="Stop NFC scan" icon="close-circle-outline" onPress={onPause} />
    </NfcActionCard>
  )
}
