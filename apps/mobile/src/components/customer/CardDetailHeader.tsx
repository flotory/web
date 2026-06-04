import { Image, Text, View } from 'react-native'

import { formatVenueCategoryLabel } from '../../lib/format'
import { venueCoverUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import { colors, radius, space } from '../../theme'
import type { VenueRef } from '../../types/loyalty'

interface CardDetailHeaderProps {
  venue: VenueRef | null | undefined
}

export default function CardDetailHeader({ venue }: CardDetailHeaderProps) {
  const cover = venueCoverUrl(venue ?? undefined)
  const categoryLabel = venue?.category ? formatVenueCategoryLabel(venue.category) : null

  return (
    <View>
      <View style={{ paddingHorizontal: space.screenX, paddingTop: 4 }}>
        <View
          style={{
            height: 200,
            borderRadius: radius.card,
            overflow: 'hidden',
            backgroundColor: colors.surfaceMuted,
          }}
        >
          {cover ? (
            <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : null}
        </View>
      </View>

      <View style={{ paddingHorizontal: space.screenX, paddingTop: 16, paddingBottom: 2 }}>
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
