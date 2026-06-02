import { Link, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'

import ProgressBar from '../src/components/customer/ProgressBar'
import CoverImage from '../src/components/ui/CoverImage'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import GradientCard from '../src/components/ui/GradientCard'
import GradientOutlineButton from '../src/components/ui/GradientOutlineButton'
import PressableCard from '../src/components/ui/PressableCard'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import StateCard from '../src/components/ui/StateCard'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import { useRewardsOverview } from '../src/hooks/useRewardsOverview'
import { progressCountCopy, progressHintCopy } from '../src/lib/progressCopy'
import { formatShortDate } from '../src/lib/format'
import { rewardImageUrl } from '../src/lib/media'
import { colors, space, type as typography } from '../src/theme'

export default function RewardsScreen() {
  const router = useRouter()
  const { data, loading, refreshing, error, refresh, reload } = useRewardsOverview()
  const [historyOpen, setHistoryOpen] = useState(false)
  const fade = useFadeOnReady(!loading)

  const readyItems = data?.readyItems ?? []
  const inProgress = data?.inProgress ?? []
  const claimed = data?.claimed ?? []

  const hasContent = useMemo(
    () => readyItems.length > 0 || inProgress.length > 0 || claimed.length > 0,
    [claimed.length, inProgress.length, readyItems.length],
  )

  const header = (
    <View style={{ paddingHorizontal: space.screenX }}>
      <ScreenHeader title="Rewards" subtitle="What you can redeem now, and what is next." />
    </View>
  )

  return (
    <CustomerScreen
      loading={loading}
      error={error}
      scrollable
      tabBarInset
      refreshing={refreshing}
      onRefresh={refresh}
      header={header}
      errorState={
        error
          ? {
              title: 'Could not load rewards',
              message: 'Try again or open your wallet to keep collecting.',
              primaryLabel: 'Try again',
              onPrimary: reload,
              secondaryLabel: 'Open wallet',
              onSecondary: () => router.push('/(customer)/wallet'),
            }
          : undefined
      }
    >
      {!error ? (
        <Animated.View style={{ opacity: fade, marginTop: space.headerBottom, paddingHorizontal: space.screenX }}>
          {!hasContent ? (
            <View style={{ marginTop: space.sectionY }}>
              <StateCard
                emoji="🎁"
                title="No rewards yet"
                message="Keep visiting your favorite spots to unlock your first treat."
                primaryAction={{ label: 'Open wallet', onPress: () => router.push('/(customer)/wallet') }}
                secondaryAction={{ label: 'Browse venues', onPress: () => router.push('/(customer)/venues') }}
              />
            </View>
          ) : null}

          {readyItems.length > 0 ? (
            <View style={{ marginTop: space.sectionY }}>
              <Text style={typography.section}>Ready now</Text>
              <View style={{ marginTop: 14, gap: 14 }}>
                {readyItems.map((item) => {
                  const image = rewardImageUrl(item.reward)

                  return (
                    <Link
                      key={item.unlock_id}
                      href={{ pathname: '/claim/[unlockId]', params: { unlockId: String(item.unlock_id) } }}
                      asChild
                    >
                      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}>
                        <GradientCard header={<CoverImage uri={image} />}>
                          <Text style={{ ...typography.label, color: colors.accent }}>🎉 Reward unlocked</Text>
                          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.plum, marginTop: 6 }}>
                            {item.reward.title}
                          </Text>
                          <Text style={{ ...typography.body, marginTop: 4, color: colors.inkMuted }}>
                            {item.customer.venue?.name ?? 'Venue'}
                          </Text>
                          <GradientOutlineButton label="Claim in store" />
                        </GradientCard>
                      </Pressable>
                    </Link>
                  )
                })}
              </View>
            </View>
          ) : null}

          {inProgress.length > 0 ? (
            <View style={{ marginTop: space.sectionY }}>
              <Text style={typography.section}>Keep collecting</Text>
              <View style={{ marginTop: 14, gap: 12 }}>
                {inProgress.map((card) => {
                  const summary = card.summary
                  const max = summary?.max_stamps ?? 10
                  const stamps = summary?.stamps ?? card.stamps
                  const remaining = summary?.stamps_to_next ?? Math.max(max - stamps, 0)
                  const title = summary?.next_reward_title ?? 'Next reward'

                  return (
                    <Link
                      key={card.id}
                      href={{
                        pathname: '/card/[cardId]',
                        params: { cardId: String(card.id), venueId: String(card.venue_id) },
                      }}
                      asChild
                    >
                      <PressableCard style={{ backgroundColor: 'transparent' }}>
                        <GradientCard>
                          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{title}</Text>
                          <Text style={{ ...typography.caption, marginTop: 2 }}>{card.venue?.name}</Text>
                          <View style={{ marginTop: space.sectionGap }}>
                            <ProgressBar value={stamps} max={max} />
                          </View>
                          <Text style={{ marginTop: 8, fontWeight: '700', color: colors.ink }}>
                            {progressHintCopy(remaining, title)}
                          </Text>
                          <Text style={{ ...typography.caption, marginTop: 2 }}>
                            {progressCountCopy(stamps, max)}
                          </Text>
                          <GradientOutlineButton label="View progress" />
                        </GradientCard>
                      </PressableCard>
                    </Link>
                  )
                })}
              </View>
            </View>
          ) : null}

          {claimed.length > 0 ? (
            <View style={{ marginTop: space.sectionY }}>
              <Pressable
                onPress={() => setHistoryOpen((value) => !value)}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={typography.section}>Claim history</Text>
                <Text style={{ fontWeight: '700', color: colors.inkMuted }}>{historyOpen ? '−' : '+'}</Text>
              </Pressable>
              {historyOpen ? (
                <View style={{ marginTop: space.cardGap, gap: space.cardGap }}>
                  {claimed.map((row) => (
                    <GradientCard key={row.id} padding={12}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
                            {row.title}
                          </Text>
                          <Text style={{ ...typography.caption, marginTop: 2, color: colors.successText }}>Redeemed</Text>
                        </View>
                        <Text style={{ ...typography.caption, fontSize: 12 }}>{formatShortDate(row.claimedAt)}</Text>
                      </View>
                    </GradientCard>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </CustomerScreen>
  )
}
