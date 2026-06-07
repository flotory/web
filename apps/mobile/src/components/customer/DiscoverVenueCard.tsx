import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Image, Platform, Text, View } from 'react-native'

import type { DiscoverVenue } from '../../lib/customerData'
import { discoverVenuePill } from '../../lib/discoverVenuePill'
import { formatVenueCategoryLabel } from '../../lib/format'
import { venueCoverUrl } from '../../lib/media'
import type { WalletCard } from '../../types/loyalty'
import PressableCard from '../ui/PressableCard'
import { colors, radius, shadows } from '../../theme'
import { withAppFont } from '../../lib/typography'

type IoniconName = ComponentProps<typeof Ionicons>['name']

function categoryIcon(category: string | null | undefined): IoniconName {
  const key = (category ?? '').toLowerCase()
  if (key === 'cafe') return 'cafe-outline'
  if (key === 'restaurant') return 'restaurant-outline'
  if (key === 'bakery') return 'ice-cream-outline'
  if (key === 'bar') return 'wine-outline'
  return 'storefront-outline'
}

interface DiscoverVenueCardProps {
  venue: DiscoverVenue
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
    borderColor: colors.discoverPillBorder,
    textColor: colors.inkMuted,
    icon: 'ribbon-outline' as const,
  },
}

export default function DiscoverVenueCard({ venue, card, distanceLabel, onPress }: DiscoverVenueCardProps) {
  const cover = venueCoverUrl(venue)
  const categoryLabel = formatVenueCategoryLabel(venue.category)
  const joined = (venue.joined_count ?? 0) > 0
  const status = discoverVenuePill(joined, venue.rewards_count, card)
  const pillStyle = PILL_STYLES[status.tone]

  return (
    <PressableCard
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={venue.name}
      style={{
        flexDirection: 'row',
        gap: 14,
        padding: 14,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.discoverCardBorder,
        ...(Platform.OS === 'ios' ? shadows.sm : { elevation: 1 }),
      }}
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: colors.discoverSearchFill,
        }}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.discoverCategoryFill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={categoryIcon(venue.category)} size={17} color={colors.discoverCategoryIcon} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={withAppFont({ fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 })}
              numberOfLines={1}
            >
              {venue.name}
            </Text>
            <Text style={withAppFont({ marginTop: 2, fontSize: 13, color: colors.inkMuted })} numberOfLines={1}>
              {distanceLabel ?? categoryLabel}
            </Text>
            {distanceLabel ? (
              <Text style={withAppFont({ marginTop: 2, fontSize: 12, color: colors.inkSoft })} numberOfLines={1}>
                {categoryLabel}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {joined ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: colors.lavender,
                borderRadius: 999,
                paddingHorizontal: 9,
                paddingVertical: 5,
              }}
            >
              <Ionicons name="checkmark-circle" size={13} color={colors.accentActive} />
              <Text style={withAppFont({ fontSize: 11, fontWeight: '700', color: colors.ink })}>Joined</Text>
            </View>
          ) : null}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: pillStyle.backgroundColor,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: pillStyle.borderColor,
              maxWidth: '100%',
            }}
          >
            <Ionicons name={pillStyle.icon} size={13} color={pillStyle.textColor} />
            <Text
              style={withAppFont({ fontSize: 12, fontWeight: '600', color: pillStyle.textColor })}
              numberOfLines={1}
            >
              {status.label}
            </Text>
          </View>
        </View>
      </View>
    </PressableCard>
  )
}
