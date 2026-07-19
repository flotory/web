import { Ionicons } from '@expo/vector-icons'
import { Image, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { rewardImageUrl } from '../../lib/media'
import { venueCategoryIcon } from '../../lib/venueCategories'
import {
  formatHeroRewardLine,
  formatHeroSubtitle,
  formatMemberStampCaption,
  formatUnlockRequirement,
  type ScanLandingMembership,
  type VenueHeroReward,
} from '../../lib/venueScanLanding'
import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'

interface VenueScanRewardHeroCardProps {
  venueName: string
  category?: string | null
  hero?: VenueHeroReward | null
  membership?: ScanLandingMembership | null
}

export default function VenueScanRewardHeroCard({ venueName, category, hero, membership }: VenueScanRewardHeroCardProps) {
  const { t } = useTranslation()
  const heroImageUri =
    hero && (hero.image_thumb || hero.image) ? rewardImageUrl(hero) ?? undefined : undefined
  const slots = membership?.target ?? (hero ? Math.min(Math.max(hero.required_stamps, 1), 10) : 0)
  const filledSlots = membership?.stamps ?? 0

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
            <Ionicons name={venueCategoryIcon(category)} size={24} color={colors.accent} />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={withAppFont({ fontSize: 18, fontWeight: '800', color: colors.ink, lineHeight: 24 })}>
            {formatHeroRewardLine(hero, venueName, t)}
          </Text>
          <Text style={withAppFont({ marginTop: 6, fontSize: 13, lineHeight: 20, color: colors.inkMuted })}>
            {formatHeroSubtitle(venueName, t)}
          </Text>

          {hero || membership ? (
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {Array.from({ length: slots }).map((_, index) => (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 4,
                      backgroundColor: index < filledSlots ? colors.accent : colors.progressTrack,
                    }}
                  />
                ))}
              </View>
              {membership ? (
                <>
                  <Text style={withAppFont({ marginTop: 10, fontSize: 13, fontWeight: '700', color: colors.ink })}>
                    {membership.stamps} / {membership.target} stamps
                  </Text>
                  <Text style={withAppFont({ marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.inkMuted })}>
                    {formatMemberStampCaption(membership, t)}
                  </Text>
                </>
              ) : hero ? (
                <>
                  <Text style={withAppFont({ marginTop: 10, fontSize: 13, fontWeight: '700', color: colors.ink })}>
                    {formatUnlockRequirement(hero.required_stamps, t)}
                  </Text>
                  <Text style={withAppFont({ marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.inkMuted })}>
                    Join to start at 0 stamps
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}
