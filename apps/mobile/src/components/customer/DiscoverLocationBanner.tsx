import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'

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
        <Text style={withAppFont({ flex: 1, fontSize: 14, color: colors.inkMuted })}>Finding venues near you…</Text>
      </View>
    )
  }

  if (hasLocation) {
    if (locatedVenueCount === 0) {
      return (
        <Text style={withAppFont({ fontSize: 13, color: colors.inkMuted, lineHeight: 19, paddingHorizontal: 2 })}>
          No venues have a map location yet. Distance will show when owners add an address on the web.
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
          <Text style={withAppFont({ fontSize: 15, fontWeight: '700', color: colors.ink })}>Location is off</Text>
          <Text style={withAppFont({ fontSize: 13, color: colors.inkMuted, lineHeight: 19 })}>
            Allow location to sort venues by distance and show how far away they are.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open location settings"
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
          <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.ink })}>Open settings</Text>
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
          Could not read your location. Try again or check that location services are enabled.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try location again"
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
          <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.ink })}>Try again</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Use location to show nearby venues"
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
        <Text style={withAppFont({ fontSize: 15, fontWeight: '700', color: colors.ink })}>Show nearby venues</Text>
        <Text style={withAppFont({ marginTop: 2, fontSize: 13, color: colors.inkMuted, lineHeight: 18 })}>
          We sort nearest-first once you allow location.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
    </Pressable>
  )
}
