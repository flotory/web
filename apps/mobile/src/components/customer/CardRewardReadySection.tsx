import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { Image, Platform, Pressable, Text, View } from 'react-native'

import { rewardImageUrl, venueLogoUrl } from '../../lib/media'
import PrimaryButton from '../ui/PrimaryButton'
import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'
import type { RewardRef, VenueRef } from '../../types/loyalty'

interface CardRewardReadySectionProps {
  reward: RewardRef
  venue?: VenueRef | null
  unlockId?: number
  onRefresh?: () => void
}

export default function CardRewardReadySection({ reward, venue, unlockId, onRefresh }: CardRewardReadySectionProps) {
  const imageUri = rewardImageUrl(reward)
  const logoUri = venueLogoUrl(venue ?? undefined)

  const card = (
    <View
      style={{
        marginHorizontal: space.screenX,
        marginTop: space.sectionGap,
        marginBottom: 8,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.successBorder,
        overflow: 'hidden',
        ...(Platform.OS === 'ios' ? shadows.md : { elevation: 2 }),
      }}
    >
      <View style={{ height: 4, backgroundColor: colors.success }} />
      <View style={{ padding: space.cardPad }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: colors.successBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="gift" size={24} color={colors.successText} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={withAppFont({ fontSize: 13, fontWeight: '600', color: colors.successText })}>Ready to claim</Text>
            <Text
              style={withAppFont({
                marginTop: 4,
                fontSize: 22,
                fontWeight: '800',
                color: colors.ink,
                lineHeight: 28,
                letterSpacing: -0.3,
              })}
              numberOfLines={2}
            >
              {reward.title}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => ({
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: radius.image,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.96 : 1,
          })}
          disabled={!unlockId}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              overflow: 'hidden',
              backgroundColor: colors.surface,
            }}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: 56, height: 56 }} resizeMode="cover" />
            ) : logoUri ? (
              <Image source={{ uri: logoUri }} style={{ width: 56, height: 56 }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cafe-outline" size={22} color={colors.inkSoft} />
              </View>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={withAppFont({ fontSize: 12, fontWeight: '600', color: colors.inkSoft })}>Claim in store</Text>
            <Text style={withAppFont({ marginTop: 2, fontSize: 15, fontWeight: '700', color: colors.ink })} numberOfLines={2}>
              {reward.title}
            </Text>
            <Text style={withAppFont({ marginTop: 4, fontSize: 13, color: colors.inkMuted, lineHeight: 18 })}>
              Tap below when you are at the counter.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </Pressable>

        {unlockId ? (
          <Link href={{ pathname: '/claim/[unlockId]', params: { unlockId: String(unlockId) } }} asChild>
            <PrimaryButton label="Claim reward" style={{ marginTop: 14 }} />
          </Link>
        ) : (
          <PrimaryButton label="Claim reward" style={{ marginTop: 14 }} onPress={onRefresh} />
        )}
      </View>
    </View>
  )

  return card
}
