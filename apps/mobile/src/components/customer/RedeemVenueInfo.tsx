import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { hasVenueMapTarget, openVenueInMaps, type VenueMapTarget } from '../../lib/openMaps'
import { withAppFont } from '../../lib/typography'
import { colors, radius, space } from '../../theme'

interface RedeemVenueInfoProps {
  venueName: string
  address?: string | null
  mapTarget: VenueMapTarget
}

export default function RedeemVenueInfo({ venueName, address, mapTarget }: RedeemVenueInfoProps) {
  const { t } = useTranslation()
  const canNavigate = hasVenueMapTarget(mapTarget)

  return (
    <View
      style={{
        padding: space.cardPad,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
      }}
    >
      <Text style={withAppFont({ fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: colors.inkSoft, textTransform: 'uppercase' })}>
        {t('redeem.redeemAt')}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="location-outline" size={20} color={colors.accentActive} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={withAppFont({ fontSize: 17, fontWeight: '800', color: colors.ink })}>{venueName}</Text>
          {address?.trim() ? (
            <Text style={withAppFont({ fontSize: 14, lineHeight: 20, color: colors.inkMuted })}>{address.trim()}</Text>
          ) : (
            <Text style={withAppFont({ fontSize: 14, color: colors.inkMuted })}>{t('redeem.askStaff')}</Text>
          )}
        </View>
      </View>

      {canNavigate ? (
        <Pressable
          onPress={() => void openVenueInMaps(mapTarget)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
            borderRadius: radius.button,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <Ionicons name="map-outline" size={18} color={colors.ink} />
          <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.ink })}>{t('redeem.getDirections')}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
