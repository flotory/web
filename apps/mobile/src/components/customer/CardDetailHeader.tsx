import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Image, Platform, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'

import CardMilestoneChips from './CardMilestoneChips'
import CardPromotionSticker from './CardPromotionSticker'
import MilestonePath from './MilestonePath'
import HomeSectionHeader from '../ui/HomeSectionHeader'
import ShakeGiftBadge from '../ui/ShakeGiftBadge'
import { formatVenueCategoryLabel, venueCategoryIcon } from '../../lib/venueCategories'
import { venueCoverUrl, venueLogoUrl } from '../../lib/media'
import { hasVenueMapTarget, openVenueInMaps } from '../../lib/openMaps'
import { withAppFont } from '../../lib/typography'
import { colors, media, overlays, radius, shadows, space } from '../../theme'
import type { MilestoneProgress, RewardRef, VenuePromotion, VenueRef } from '../../types/loyalty'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface CardDetailHeaderProps {
  venue: VenueRef | null | undefined
  promotion?: VenuePromotion | null
  stamps: number
  progressTarget: number
  nextReward: RewardRef | null
  milestones: MilestoneProgress[]
  animatingSlots?: number[]
  celebrateGiftStamp?: number | null
}

export default function CardDetailHeader({
  venue,
  promotion = null,
  stamps,
  progressTarget,
  nextReward,
  milestones,
  animatingSlots = [],
  celebrateGiftStamp = null,
}: CardDetailHeaderProps) {
  const { t } = useTranslation()
  const cover = venueCoverUrl(venue ?? undefined)
  const logo = venueLogoUrl(venue ?? undefined)
  const categoryLabel = venue?.category ? formatVenueCategoryLabel(venue.category) : null
  const mapTarget = {
    latitude: venue?.latitude,
    longitude: venue?.longitude,
    address: venue?.address,
    label: venue?.name,
  }
  const canNavigate = hasVenueMapTarget(mapTarget)
  const coverHeight = media.coverHeight

  const slotCount = Math.max(progressTarget, 1)
  const goalTitle = nextReward?.title ?? 'Your next reward'
  const collected = Math.min(stamps, slotCount)
  const toGo = Math.max(progressTarget - collected, 0)
  const redeemedMilestones = milestones.filter((item) => item.claimed)
  const hasRedeemedReward = redeemedMilestones.length > 0
  const milestoneStamps = milestones
    .filter((item) => !item.claimed)
    .map((item) => item.required_stamps)
    .filter((value) => value > 0 && value < progressTarget && value <= slotCount)
  const gridColumns = 5
  const sizeScale = slotCount > 10 ? 0.9 : 1
  const showPromotionSticker = Boolean(promotion && promotion.multiplier > 1)

  return (
    <View style={{ paddingHorizontal: space.screenX, paddingTop: 8 }}>
      <View
        style={{
          borderRadius: radius.card,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...(Platform.OS === 'ios' ? shadows.md : { elevation: 3 }),
        }}
      >
        <View style={{ height: coverHeight, backgroundColor: colors.surfaceMuted, overflow: 'visible' }}>
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
              <Ionicons name={venueCategoryIcon(venue?.category)} size={48} color={colors.accentActive} />
            </View>
          )}

          <LinearGradient
            colors={['transparent', overlays.scrimBottom]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }}
          />

          <View
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: overlays.ink72,
              borderWidth: 1,
              borderColor: overlays.accent35,
            }}
          >
            <Ionicons name="card-outline" size={13} color={colors.accent} />
            <Text style={withAppFont({ fontSize: 11, fontWeight: '800', color: colors.primaryText })}>
              YOUR LOYALTY CARD
            </Text>
          </View>

          {showPromotionSticker ? <CardPromotionSticker multiplier={promotion!.multiplier} /> : null}

          <View
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 16,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 12,
            }}
          >
            {logo ? (
              <Image
                source={{ uri: logo }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: overlays.white20,
                }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={withAppFont({
                  fontSize: 26,
                  fontWeight: '800',
                  color: colors.primaryText,
                  letterSpacing: -0.4,
                  lineHeight: 30,
                })}
                numberOfLines={2}
              >
                {venue?.name ?? t('card.loyaltyCard')}
              </Text>
              {categoryLabel ? (
                <Text
                  style={withAppFont({
                    marginTop: 4,
                    fontSize: 13,
                    fontWeight: '600',
                    color: overlays.white82,
                  })}
                  numberOfLines={1}
                >
                  {categoryLabel}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {venue?.address?.trim() || canNavigate ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              gap: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            {venue?.address?.trim() ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Ionicons name="location-outline" size={17} color={colors.inkSoft} style={{ marginTop: 2 }} />
                <Text
                  style={withAppFont({ flex: 1, fontSize: 14, lineHeight: 20, color: colors.inkMuted })}
                  numberOfLines={2}
                >
                  {venue.address.trim()}
                </Text>
              </View>
            ) : null}

            {canNavigate ? (
              <Pressable
                onPress={() => void openVenueInMaps(mapTarget)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 11,
                  borderRadius: radius.button,
                  backgroundColor: colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <Ionicons name="map-outline" size={17} color={colors.ink} />
                <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.ink })}>Get directions</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={{ padding: space.cardPad }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <HomeSectionHeader title={goalTitle} label={t('card.yourProgress')} />
            </View>
            <View
              style={{
                flexShrink: 0,
                marginTop: 2,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: colors.accentSoft,
                borderWidth: 1,
                borderColor: colors.accentBorder,
              }}
            >
              <Text style={withAppFont({ fontSize: 13, fontWeight: '800', color: colors.accentActive })}>
                {collected}/{progressTarget}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <MilestonePath
              collected={collected}
              total={slotCount}
              milestoneStamps={milestoneStamps}
              claimedStamps={milestones.filter((item) => item.claimed).map((item) => item.required_stamps)}
              highlightStamps={animatingSlots}
              celebrateGiftStamp={celebrateGiftStamp}
              columns={gridColumns}
              showStampNumbers
              sizeScale={sizeScale}
              endSlot={<ShakeGiftBadge />}
            />
            <Text
              style={withAppFont({
                marginTop: 10,
                fontSize: 13,
                fontWeight: '600',
                color: colors.inkMuted,
                textAlign: 'center',
                lineHeight: 18,
              })}
            >
              {hasRedeemedReward && toGo <= 0
                ? 'Reward used — keep collecting for your next treat'
                : toGo > 0
                  ? `${toGo} ${toGo === 1 ? 'stamp' : 'stamps'} until “${goalTitle}”`
                  : 'Ready to claim — open Rewards'}
            </Text>
          </View>

          <CardMilestoneChips milestones={milestones} stamps={stamps} />
        </View>
      </View>
    </View>
  )
}
