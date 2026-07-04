import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type { ComponentProps } from 'react'
import { Image, Platform, Pressable, Text, View } from 'react-native'

import type { DiscoverVenue } from '../../lib/customerData'
import { discoverVenuePill } from '../../lib/discoverVenuePill'
import { formatVenueCategoryLabel, venueCategoryIcon } from '../../lib/venueCategories'
import { venueCoverUrl } from '../../lib/media'
import { openVenueInMaps } from '../../lib/openMaps'
import type { WalletCard } from '../../types/loyalty'
import PressableCard from '../ui/PressableCard'
import { colors, media, radius, shadows } from '../../theme'
import { withAppFont } from '../../lib/typography'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface DiscoverVenueCardProps {
  venue: DiscoverVenue
  nearestLocationName?: string | null
  card?: WalletCard | null
  distanceLabel?: string | null
  onPress: () => void
}

const PILL_STYLES = {
  ready: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    textColor: colors.successText,
    icon: 'gift' as const,
  },
  progress: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
    textColor: colors.ink,
    icon: 'ticket-outline' as const,
  },
  catalog: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    textColor: colors.inkMuted,
    icon: 'ribbon-outline' as const,
  },
}

export default function DiscoverVenueCard({
  venue,
  nearestLocationName,
  card,
  distanceLabel,
  onPress,
}: DiscoverVenueCardProps) {
  const cover = venueCoverUrl(venue)
  const categoryLabel = formatVenueCategoryLabel(venue.category)
  const hasMultipleLocations = (venue.branches_count ?? 0) > 1
  const nearestBranchLabel =
    hasMultipleLocations
    && nearestLocationName
    && nearestLocationName !== venue.name
      ? nearestLocationName
      : null
  const locationLabel = nearestBranchLabel
    ?? (hasMultipleLocations ? `${venue.branches_count} locations` : categoryLabel)
  const joined = (venue.joined_count ?? 0) > 0
  const status = discoverVenuePill(joined, venue.rewards_count, card)
  const pillStyle = PILL_STYLES[status.tone]
  const canOpenMaps = Boolean(distanceLabel)
  const coverHeight = media.coverHeight

  function handleDirections() {
    void openVenueInMaps({
      latitude: venue.latitude,
      longitude: venue.longitude,
      address: venue.address,
      label: venue.name,
    })
  }

  return (
    <PressableCard
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={venue.name}
      style={{
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        ...(Platform.OS === 'ios' ? shadows.md : { elevation: 2 }),
      }}
    >
      <View style={{ height: coverHeight, backgroundColor: colors.surfaceMuted }}>
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accentSoft,
            }}
          >
            <Ionicons name={venueCategoryIcon(venue.category)} size={40} color={colors.accentActive} />
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(5, 13, 30, 0.55)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 72,
          }}
        />

        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 12,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={withAppFont({
                fontSize: 20,
                fontWeight: '800',
                color: colors.primaryText,
                letterSpacing: -0.3,
              })}
              numberOfLines={2}
            >
              {venue.name}
            </Text>
            <Text style={withAppFont({ marginTop: 2, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' })} numberOfLines={1}>
              {locationLabel}
            </Text>
          </View>
          {distanceLabel ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.92)',
              }}
            >
              <Ionicons name="navigate-outline" size={13} color={colors.ink} />
              <Text style={withAppFont({ fontSize: 12, fontWeight: '800', color: colors.ink })}>{distanceLabel}</Text>
            </View>
          ) : null}
        </View>

        {joined ? (
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(5, 13, 30, 0.72)',
              borderWidth: 1,
              borderColor: 'rgba(215, 163, 93, 0.35)',
            }}
          >
            <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
            <Text style={withAppFont({ fontSize: 11, fontWeight: '800', color: colors.primaryText })}>Joined</Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {venue.address ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <Ionicons name="location-outline" size={16} color={colors.inkSoft} style={{ marginTop: 1 }} />
            <Text style={withAppFont({ flex: 1, fontSize: 14, color: colors.inkMuted, lineHeight: 20 })} numberOfLines={2}>
              {venue.address}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: pillStyle.backgroundColor,
              borderRadius: 999,
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: pillStyle.borderColor,
              maxWidth: '100%',
            }}
          >
            <Ionicons name={pillStyle.icon} size={14} color={pillStyle.textColor} />
            <Text
              style={withAppFont({ fontSize: 12, fontWeight: '700', color: pillStyle.textColor })}
              numberOfLines={1}
            >
              {status.label}
            </Text>
          </View>

          {canOpenMaps ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open directions to ${venue.name}`}
              onPress={handleDirections}
              hitSlop={6}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: colors.surfaceMuted,
                borderRadius: 999,
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Ionicons name="map-outline" size={14} color={colors.ink} />
              <Text style={withAppFont({ fontSize: 12, fontWeight: '700', color: colors.ink })}>Directions</Text>
            </Pressable>
          ) : null}

          <View style={{ marginLeft: 'auto' }}>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </View>
        </View>
      </View>
    </PressableCard>
  )
}
