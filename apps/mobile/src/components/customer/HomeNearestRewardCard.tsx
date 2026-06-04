import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { Image, Pressable, Text, View } from 'react-native'

import { rewardImageUrl, venueLogoUrl } from '../../lib/media'
import { progressCountCopy, visitsToRewardCopy } from '../../lib/progressCopy'
import GradientCard from '../ui/GradientCard'
import ShakeGiftBadge from '../ui/ShakeGiftBadge'
import { colors, radius, shadows, space, type as typography } from '../../theme'
import type { RewardWalletItem, WalletCard } from '../../types/loyalty'
import ProgressRing from './ProgressRing'

export type NearestRewardFocus =
  | { kind: 'ready'; item: RewardWalletItem }
  | { kind: 'next'; card: WalletCard }

interface HomeNearestRewardCardProps {
  focus: NearestRewardFocus
}

function StampDots({ filled, total }: { filled: number; total: number }) {
  const slots = Math.min(Math.max(total, 1), 10)

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
      {Array.from({ length: slots }, (_, index) => {
        const active = index < filled
        return (
          <View
            key={index}
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.lavender : colors.surfaceMuted,
              borderWidth: 1,
              borderColor: active ? colors.lavenderBorder : colors.border,
            }}
          >
            {active ? <Ionicons name="cafe" size={14} color={colors.primary} /> : null}
          </View>
        )
      })}
    </View>
  )
}

export default function HomeNearestRewardCard({ focus }: HomeNearestRewardCardProps) {
  const isReady = focus.kind === 'ready'
  const venue = isReady ? focus.item.customer.venue : focus.card.venue
  const title = isReady
    ? focus.item.reward.title
    : focus.card.summary?.next_reward_title ?? 'Your next reward'
  const summary = isReady ? focus.item.customer.summary : focus.card.summary
  const max = summary?.max_stamps ?? 10
  const stamps = summary?.stamps ?? (isReady ? focus.item.customer.stamps : focus.card.stamps)
  const nextTarget = summary?.next_reward_stamps ?? max
  const currentToNext = Math.min(stamps, nextTarget)
  const toNext = Math.max(nextTarget - currentToNext, 0)
  const imageUri = isReady
    ? rewardImageUrl(focus.item.reward)
    : rewardImageUrl({ title, image: null, image_thumb: null })

  const cardBody = (
    <GradientCard padding={space.cardPad}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        {!isReady ? (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ProgressRing value={currentToNext} max={nextTarget} size={58} />
            <Text style={{ ...typography.caption, marginTop: 4, fontWeight: '700' }}>
              {currentToNext}/{nextTarget}
            </Text>
          </View>
        ) : (
          <ShakeGiftBadge />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.caption, color: colors.inkSoft, fontWeight: '600' }}>
            {isReady ? 'Ready to claim' : `You're ${toNext} ${toNext === 1 ? 'stamp' : 'stamps'} away`}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 20, fontWeight: '800', color: colors.ink, lineHeight: 26 }}>
            {isReady ? title : `Your next reward`}
          </Text>
          {!isReady ? (
            <Text style={{ marginTop: 4, fontSize: 15, fontWeight: '700', color: colors.inkMuted }}>{title}</Text>
          ) : null}
          <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={14} color={colors.inkMuted} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.inkMuted }}>{venue?.name ?? 'Venue'}</Text>
          </View>
        </View>
      </View>

      {!isReady ? (
        <>
          <StampDots filled={currentToNext} total={nextTarget} />
          <Text style={{ ...typography.caption, marginTop: 10 }}>{progressCountCopy(currentToNext, nextTarget)}</Text>
        </>
      ) : (
        <Text style={{ ...typography.caption, marginTop: 12 }}>{visitsToRewardCopy(0, title)}</Text>
      )}

      <View
        style={{
          marginTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          borderRadius: radius.image,
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
        }}
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
            <Image source={{ uri: imageUri }} style={{ width: 56, height: 56 }} />
          ) : venueLogoUrl(venue ?? undefined) ? (
            <Image source={{ uri: venueLogoUrl(venue ?? undefined)! }} style={{ width: 56, height: 56 }} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24 }}>🎁</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.caption, color: colors.inkSoft }}>{isReady ? 'Claim in store' : 'Up next'}</Text>
          <Text style={{ marginTop: 2, fontSize: 16, fontWeight: '800', color: colors.ink }}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
      </View>
    </GradientCard>
  )

  if (isReady) {
    return (
      <Link href={{ pathname: '/claim/[unlockId]', params: { unlockId: String(focus.item.unlock_id) } }} asChild>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.97 : 1 }, shadows.sm]}>{cardBody}</Pressable>
      </Link>
    )
  }

  return (
    <Link
      href={{
        pathname: '/card/[cardId]',
        params: { cardId: String(focus.card.id), venueId: String(focus.card.venue_id) },
      }}
      asChild
    >
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.97 : 1 }, shadows.sm]}>{cardBody}</Pressable>
    </Link>
  )
}
