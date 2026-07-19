import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import type { CustomerLocationStatus } from '../../hooks/useCustomerLocation'
import { withAppFont } from '../../lib/typography'
import { colors, radius } from '../../theme'

interface DiscoverLocationBannerProps {
  status: CustomerLocationStatus
  hasLocation: boolean
  locatedVenueCount: number
  onRequestLocation: () => void
  onOpenSettings: () => void
}

/** Shown only when location needs attention — not when sorting is already working. */
export default function DiscoverLocationBanner({
  status,
  hasLocation,
  locatedVenueCount,
  onRequestLocation,
  onOpenSettings,
}: DiscoverLocationBannerProps) {
  const { t } = useTranslation()

  if (status === 'loading') {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: radius.image,
          backgroundColor: colors.surfaceMuted,
        }}
      >
        <Ionicons name="locate-outline" size={18} color={colors.inkMuted} />
        <Text style={withAppFont({ flex: 1, fontSize: 14, color: colors.inkMuted })}>{t('location.finding')}</Text>
      </View>
    )
  }

  if (hasLocation) {
    if (locatedVenueCount === 0) {
      return (
        <Text style={withAppFont({ fontSize: 13, color: colors.inkMuted, lineHeight: 19, paddingHorizontal: 2 })}>
          {t('location.noMapLocation')}
        </Text>
      )
    }

    return null
  }

  if (status === 'denied') {
    return (
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 14,
          borderRadius: radius.image,
          backgroundColor: colors.surfaceMuted,
          gap: 12,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text style={withAppFont({ fontSize: 15, fontWeight: '700', color: colors.ink })}>{t('location.off')}</Text>
          <Text style={withAppFont({ fontSize: 13, color: colors.inkMuted, lineHeight: 19 })}>
          {t('location.offMessage')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('location.openSettingsA11y')}
          onPress={onOpenSettings}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            borderRadius: 999,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
            paddingVertical: 9,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.ink })}>{t('location.openSettings')}</Text>
        </Pressable>
      </View>
    )
  }

  if (status === 'unavailable') {
    return (
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 14,
          borderRadius: radius.image,
          backgroundColor: colors.surfaceMuted,
          gap: 12,
        }}
      >
        <Text style={withAppFont({ fontSize: 13, color: colors.inkMuted, lineHeight: 19 })}>
          {t('location.unavailableMessage')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('location.tryAgainA11y')}
          onPress={onRequestLocation}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            borderRadius: 999,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
            paddingVertical: 9,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.ink })}>{t('location.tryAgain')}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('location.enableA11y')}
      onPress={onRequestLocation}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: radius.image,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="location-outline" size={20} color={colors.accentActive} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={withAppFont({ fontSize: 15, fontWeight: '700', color: colors.ink })}>{t('location.showNearby')}</Text>
        <Text style={withAppFont({ marginTop: 2, fontSize: 13, color: colors.inkMuted, lineHeight: 18 })}>
          {t('location.showNearbySubtitle')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
    </Pressable>
  )
}
