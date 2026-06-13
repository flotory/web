import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Image, Text, View } from 'react-native'

import { rewardImageUrl } from '../../lib/media'
import {
  formatHeroRewardLine,
  formatHeroSubtitle,
  formatUnlockRequirement,
  type VenueHeroReward,
} from '../../lib/venueScanLanding'
import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'

type IoniconName = ComponentProps<typeof Ionicons>['name']

function categoryIcon(category?: string | null): IoniconName {
  const key = (category ?? '').toLowerCase()
  if (key === 'cafe' || key === 'coffee') return 'cafe-outline'
  if (key === 'bar') return 'wine-outline'
  if (key === 'bakery') return 'ice-cream-outline'
  if (key === 'restaurant') return 'restaurant-outline'
  return 'gift-outline'
}

interface VenueScanRewardHeroCardProps {
  venueName: string
  category?: string | null
  hero?: VenueHeroReward | null
}

export default function VenueScanRewardHeroCard({ venueName, category, hero }: VenueScanRewardHeroCardProps) {
  const heroImageUri =
    hero && (hero.image_thumb || hero.image) ? rewardImageUrl(hero) ?? undefined : undefined
  const slots = hero ? Math.min(Math.max(hero.required_stamps, 1), 10) : 0

  return (
    <View
      style={{
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: space.cardPad,
        ...(shadows.sm as object),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.accentBorder,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {heroImageUri ? (
            <Image source={{ uri: heroImageUri }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Ionicons name={categoryIcon(category)} size={24} color={colors.accent} />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={withAppFont({ fontSize: 18, fontWeight: '800', color: colors.ink, lineHeight: 24 })}>
            {formatHeroRewardLine(hero, venueName)}
          </Text>
          <Text style={withAppFont({ marginTop: 6, fontSize: 13, lineHeight: 20, color: colors.inkMuted })}>
            {formatHeroSubtitle(venueName)}
          </Text>

          {hero ? (
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {Array.from({ length: slots }).map((_, index) => (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 4,
                      backgroundColor: colors.progressTrack,
                    }}
                  />
                ))}
              </View>
              <Text style={withAppFont({ marginTop: 10, fontSize: 13, fontWeight: '700', color: colors.ink })}>
                {formatUnlockRequirement(hero.required_stamps)}
              </Text>
              <Text style={withAppFont({ marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.inkMuted })}>
                Join to start at 0 stamps
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}
