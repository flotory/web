import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { Image, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { rewardImageUrl, venueLogoUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows } from '../../theme'
import type { RewardWalletItem } from '../../types/loyalty'

const MEDIA_SIZE = 88
const MEDIA_RADIUS = 20
const VENUE_LOGO_SIZE = 22

interface HomeReadyPassCardProps {
  item: RewardWalletItem
}

export default function HomeReadyPassCard({ item }: HomeReadyPassCardProps) {
  const title = item.reward.title
  const venueName = item.customer.venue?.name ?? 'Venue'
  const imageUri = rewardImageUrl(item.reward)
  const logoUri = venueLogoUrl(item.customer.venue ?? undefined)

  return (
    <Link
      href={{
        pathname: '/redeem/[unlockId]',
        params: { unlockId: String(item.unlock_id) },
      }}
      asChild
    >
      <Pressable
        testID="reward-redeem-link"
        style={({ pressed }) => [{ opacity: pressed ? 0.97 : 1, transform: [{ scale: pressed ? 0.992 : 1 }] }]}
      >
        <LinearGradient
          colors={['#071225', colors.primary, '#0c1a30']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius.card,
            padding: 18,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(215, 163, 93, 0.24)',
            ...shadows.md,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -28,
              right: 40,
              width: 110,
              height: 110,
              borderRadius: 22,
              backgroundColor: 'rgba(215, 163, 93, 0.1)',
              transform: [{ rotate: '14deg' }],
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: 'rgba(215, 163, 93, 0.14)',
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
              <Text style={withAppFont({ fontSize: 10, fontWeight: '800', letterSpacing: 0.9, color: colors.accent })}>
                READY TO REDEEM
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
          </View>

          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={withAppFont({
                  fontSize: 28,
                  fontWeight: '800',
                  color: colors.primaryText,
                  letterSpacing: -0.55,
                  lineHeight: 32,
                })}
                numberOfLines={2}
              >
                {title}
              </Text>

              <View
                style={{
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  gap: 7,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255, 255, 255, 0.07)',
                }}
              >
                {logoUri ? (
                  <Image
                    source={{ uri: logoUri }}
                    style={{
                      width: VENUE_LOGO_SIZE,
                      height: VENUE_LOGO_SIZE,
                      borderRadius: 7,
                      backgroundColor: colors.surface,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: VENUE_LOGO_SIZE,
                      height: VENUE_LOGO_SIZE,
                      borderRadius: 7,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="cafe-outline" size={12} color={colors.primaryText} />
                  </View>
                )}
                <Text style={withAppFont({ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.82)' })} numberOfLines={1}>
                  {venueName}
                </Text>
              </View>

              <Text style={withAppFont({ marginTop: 14, fontSize: 14, fontWeight: '700', color: colors.accent })}>
                Tap to redeem at the counter →
              </Text>
            </View>

            <View
              style={{
                width: MEDIA_SIZE,
                height: MEDIA_SIZE,
                borderRadius: MEDIA_RADIUS,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(215, 163, 93, 0.28)',
              }}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: MEDIA_SIZE, height: MEDIA_SIZE }} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="gift-outline" size={34} color={colors.accent} />
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Link>
  )
}
