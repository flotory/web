import { Link } from 'expo-router'
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'

import ProgressBar from './ProgressBar'
import CoverImage from '../ui/CoverImage'
import GradientCard from '../ui/GradientCard'
import GradientOutlineButton from '../ui/GradientOutlineButton'
import PressableCard from '../ui/PressableCard'
import StateCard from '../ui/StateCard'
import { walletCardProgressCopy } from '../../lib/progressCopy'
import { venueCoverUrl, venueLogoUrl } from '../../lib/media'
import { colors, radius, space, shadows, type as typography, walletStack } from '../../theme'
import type { WalletCard } from '../../types/loyalty'
import { withAppFont } from '../../lib/typography'

const WALLET_AVATAR = 44
const WALLET_AVATAR_GAP = 10

interface WalletStackedCardsProps {
  cards: WalletCard[]
  refreshing: boolean
  onRefresh: () => void
  bottomInset: number
  emptySearch?: boolean
  onClearSearch?: () => void
}

function WalletStackCard({ item }: { item: WalletCard }) {
  const summary = item.summary
  const max = summary?.max_stamps ?? 10
  const stamps = summary?.stamps ?? item.stamps
  const toNext = summary?.stamps_to_next ?? Math.max(max - stamps, 0)
  const nextTitle = summary?.next_reward_title ?? 'your reward'
  const logo = venueLogoUrl(item.venue ?? undefined)
  const progress = walletCardProgressCopy(stamps, max, toNext, nextTitle)

  return (
    <Link
      href={{
        pathname: '/card/[cardId]',
        params: { cardId: String(item.id), venueId: String(item.venue_id) },
      }}
      asChild
    >
      <PressableCard style={{ backgroundColor: 'transparent' }}>
        <GradientCard
          style={{ height: walletStack.cardHeight }}
          header={<CoverImage uri={venueCoverUrl(item.venue ?? undefined)} />}
          overlap={
            <View
              style={{
                width: WALLET_AVATAR,
                height: WALLET_AVATAR,
                borderRadius: 12,
                backgroundColor: colors.surfaceMuted,
                borderWidth: 2,
                borderColor: colors.surface,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {logo ? (
                <Image source={{ uri: logo }} style={{ width: WALLET_AVATAR, height: WALLET_AVATAR }} />
              ) : (
                <Text style={{ fontSize: 20 }}>☕</Text>
              )}
            </View>
          }
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              height: WALLET_AVATAR,
              marginBottom: space.sectionGap,
            }}
          >
            <View style={{ width: WALLET_AVATAR + WALLET_AVATAR_GAP }} />
            <Text style={withAppFont({ flex: 1, fontSize: 18, fontWeight: '800', color: colors.plum })} numberOfLines={1}>
              {item.venue?.name ?? 'Venue'}
            </Text>
          </View>
          <ProgressBar value={stamps} max={max} />
          <Text style={withAppFont({ marginTop: 8, fontSize: 15, fontWeight: '700', color: colors.ink })}>{progress.primary}</Text>
          <Text style={{ ...typography.caption, marginTop: 4 }}>{progress.secondary}</Text>
          <GradientOutlineButton label="View progress" />
        </GradientCard>
      </PressableCard>
    </Link>
  )
}

export default function WalletStackedCards({
  cards,
  refreshing,
  onRefresh,
  bottomInset,
  emptySearch,
  onClearSearch,
}: WalletStackedCardsProps) {
  if (emptySearch) {
    return (
      <View style={{ paddingHorizontal: space.screenX, paddingTop: space.sectionGap }}>
        <StateCard
          emoji="🔍"
          title="No matches"
          message="Try a different venue name."
          primaryAction={{ label: 'Clear search', onPress: () => onClearSearch?.() }}
        />
      </View>
    )
  }

  const stackHeight = walletStack.cardHeight + Math.max(0, cards.length - 1) * walletStack.peek

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{
        paddingHorizontal: space.screenX,
        paddingBottom: bottomInset + 24,
        paddingTop: 4,
      }}
    >
      <View style={{ height: stackHeight, position: 'relative' }}>
        {cards.map((item, index) => {
          const top = (cards.length - 1 - index) * walletStack.peek
          const zIndex = cards.length - index

          return (
            <View
              key={item.id}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top,
                zIndex,
                ...shadows.md,
                elevation: zIndex,
              }}
            >
              <WalletStackCard item={item} />
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}
