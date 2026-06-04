import { Ionicons } from '@expo/vector-icons'
import { Image, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { formatVenueCategoryLabel } from '../../lib/format'
import { venueCoverUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import { colors, space } from '../../theme'
import type { VenueRef } from '../../types/loyalty'

interface CardDetailHeaderProps {
  venue: VenueRef | null | undefined
  topInset: number
  onBack: () => void
}

export default function CardDetailHeader({ venue, topInset, onBack }: CardDetailHeaderProps) {
  const cover = venueCoverUrl(venue ?? undefined)
  const categoryLabel = venue?.category ? formatVenueCategoryLabel(venue.category) : null

  return (
    <View>
      <View style={{ height: 240, backgroundColor: colors.surfaceMuted }}>
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
        <LinearGradient
          colors={['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.35)', 'rgba(248,250,252,0.95)']}
          locations={[0.2, 0.65, 1]}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: topInset + 8,
            left: space.screenX,
          }}
        >
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.96)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: space.screenX, paddingTop: 14, paddingBottom: 2 }}>
        <Text style={withAppFont({ fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 })}>
          {venue?.name ?? 'Loyalty card'}
        </Text>
        {categoryLabel || venue?.address ? (
          <Text style={withAppFont({ marginTop: 6, fontSize: 14, fontWeight: '500', color: colors.inkMuted })}>
            {[venue?.address?.trim(), categoryLabel].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
