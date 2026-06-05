import { Ionicons } from '@expo/vector-icons'
import { Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, space } from '../../theme'
import type { VenuePromotion } from '../../types/loyalty'

interface CardPromotionBannerProps {
  promotion: VenuePromotion
}

export default function CardPromotionBanner({ promotion }: CardPromotionBannerProps) {
  return (
    <View
      style={{
        marginHorizontal: space.screenX,
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.accentSoft,
        borderRadius: radius.image,
        borderWidth: 1,
        borderColor: colors.accentBorder,
        paddingVertical: 13,
        paddingHorizontal: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16 }}>🔥</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={withAppFont({ fontSize: 15, fontWeight: '800', color: colors.ink })} numberOfLines={1}>
          {promotion.headline}
        </Text>
        <Text style={withAppFont({ marginTop: 3, fontSize: 13, fontWeight: '500', color: colors.inkMuted })} numberOfLines={2}>
          {promotion.message}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
    </View>
  )
}
