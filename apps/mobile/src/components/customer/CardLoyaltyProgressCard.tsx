import { Platform, Text, View } from 'react-native'

import MilestonePath from './MilestonePath'
import CardMilestoneChips from './CardMilestoneChips'
import ShakeGiftBadge from '../ui/ShakeGiftBadge'
import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'
import type { MilestoneProgress, RewardRef } from '../../types/loyalty'

interface CardLoyaltyProgressCardProps {
  stamps: number
  progressTarget: number
  nextReward: RewardRef | null
  milestones: MilestoneProgress[]
  animatingSlots?: number[]
  celebrateGiftStamp?: number | null
}

export default function CardLoyaltyProgressCard({
  stamps,
  progressTarget,
  nextReward,
  milestones,
  animatingSlots = [],
  celebrateGiftStamp = null,
}: CardLoyaltyProgressCardProps) {
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

  return (
    <View
      style={{
        marginHorizontal: space.screenX,
        marginTop: space.sectionGap,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.discoverCardBorder,
        padding: space.cardPad,
        ...(Platform.OS === 'ios' ? shadows.md : { elevation: 2 }),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
          <Text style={withAppFont({ fontSize: 13, fontWeight: '600', color: colors.inkMuted })}>Your progress</Text>
          <Text
            style={withAppFont({
              marginTop: 6,
              fontSize: 21,
              fontWeight: '800',
              color: colors.ink,
              lineHeight: 26,
              letterSpacing: -0.35,
            })}
            numberOfLines={2}
          >
            {goalTitle}
          </Text>
        </View>
        <View
          style={{
            flexShrink: 0,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: colors.successBg,
            borderWidth: 1,
            borderColor: colors.successBorder,
          }}
        >
          <Text style={withAppFont({ fontSize: 13, fontWeight: '800', color: colors.successText })}>
            {collected} of {progressTarget}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
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
            marginTop: 12,
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
  )
}
