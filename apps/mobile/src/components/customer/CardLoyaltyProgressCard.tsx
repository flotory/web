import { Platform, Text, View } from 'react-native'

import MilestonePath from './MilestonePath'
import CardMilestoneChips from './CardMilestoneChips'
import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'
import type { MilestoneProgress, RewardRef } from '../../types/loyalty'

interface CardLoyaltyProgressCardProps {
  stamps: number
  progressTarget: number
  nextReward: RewardRef | null
  rewardReady?: boolean
  readyRewardTitle?: string | null
  milestones: MilestoneProgress[]
  animatingSlots?: number[]
}

export default function CardLoyaltyProgressCard({
  stamps,
  progressTarget,
  nextReward,
  rewardReady = false,
  readyRewardTitle,
  milestones,
  animatingSlots = [],
}: CardLoyaltyProgressCardProps) {
  const slotCount = Math.max(progressTarget, 1)
  const goalTitle = (rewardReady ? readyRewardTitle : nextReward?.title) ?? 'Your next reward'
  const collected = Math.min(stamps, slotCount)
  const toGo = Math.max(progressTarget - collected, 0)
  const progressRatio = progressTarget > 0 ? Math.min(collected / progressTarget, 1) : 0
  const milestoneStamps = milestones
    .map((item) => item.required_stamps)
    .filter((value) => value <= slotCount)

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
          {rewardReady ? (
            <Text style={withAppFont({ marginTop: 4, fontSize: 12, fontWeight: '700', color: colors.successText })}>
              Ready to claim
            </Text>
          ) : null}
          <Text
            style={withAppFont({
              marginTop: rewardReady ? 4 : 6,
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
          cellShape="circle"
          layout="row"
          sizeScale={slotCount > 12 ? 0.88 : 1}
        />
      </View>

      <View style={{ marginTop: 18 }}>
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.progressTrack,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.round(progressRatio * 100)}%`,
              height: '100%',
              backgroundColor: colors.success,
              borderRadius: 3,
            }}
          />
        </View>
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={withAppFont({ fontSize: 13, fontWeight: '600', color: colors.inkMuted })}>
            {collected} collected
          </Text>
          <Text style={withAppFont({ fontSize: 13, fontWeight: '600', color: colors.inkMuted })}>
            {toGo > 0 ? `${toGo} more to go` : 'Unlocked'}
          </Text>
        </View>
      </View>

      <CardMilestoneChips milestones={milestones} stamps={stamps} />
    </View>
  )
}
