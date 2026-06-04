import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'

import { rewardImageUrl, venueLogoUrl } from '../../lib/media'
import { visitsToRewardCopy } from '../../lib/progressCopy'
import GradientCard from '../ui/GradientCard'
import GradientOutlineButton from '../ui/GradientOutlineButton'
import { colors, carousel, radius, space, type as typography } from '../../theme'
import type { RewardWalletItem, WalletCard } from '../../types/loyalty'
import { withAppFont } from '../../lib/typography'

export type HomeRewardSlide =
  | { id: string; kind: 'ready'; item: RewardWalletItem }
  | { id: string; kind: 'next'; card: WalletCard }

interface HomeRewardCarouselProps {
  slides: HomeRewardSlide[]
}

const transparent = { backgroundColor: 'transparent' as const }

function RewardCarouselCard({ slide, width }: { slide: HomeRewardSlide; width: number }) {
  const isReady = slide.kind === 'ready'
  const reward = isReady ? slide.item.reward : null
  const venue = isReady ? slide.item.customer.venue : slide.card.venue
  const title = isReady
    ? slide.item.reward.title
    : slide.card.summary?.next_reward_title ?? 'Your next reward'
  const imageUri = isReady
    ? rewardImageUrl(reward ?? undefined)
    : venueLogoUrl(venue ?? undefined) ?? rewardImageUrl({ title })
  const stampsLeft = slide.kind === 'next' ? slide.card.summary?.stamps_to_next ?? null : null

  const card = (
    <GradientCard style={{ width }} padding={carousel.cardPad}>
      <View style={[transparent, { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }]}>
        <View
          style={{
            width: carousel.rewardImageSize,
            height: carousel.rewardImageSize,
            borderRadius: radius.image,
            backgroundColor: colors.accentSoft,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: carousel.rewardImageSize, height: carousel.rewardImageSize }} />
          ) : (
            <Text style={{ fontSize: 30 }}>🎁</Text>
          )}
        </View>
        <View style={[transparent, { flex: 1, paddingTop: 2 }]}>
          <Text style={withAppFont({ ...typography.caption, color: colors.inkSoft, fontWeight: '600', fontSize: 12 })}>
            {isReady ? 'Reward unlocked' : 'Your next reward'}
          </Text>
          <Text style={withAppFont({ marginTop: 4, fontSize: 16, fontWeight: '800', color: colors.ink, lineHeight: 21 })} numberOfLines={3}>
            {title}
          </Text>
        </View>
      </View>

      <View style={[transparent, { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }]}>
        <Ionicons name="location-outline" size={15} color={colors.inkMuted} />
        <Text style={withAppFont({ fontSize: 14, fontWeight: '600', color: colors.inkMuted })}>{venue?.name ?? 'Venue'}</Text>
      </View>

      {!isReady && stampsLeft != null ? (
        <Text style={{ ...typography.caption, marginTop: 6, textAlign: 'center', fontSize: 12 }}>
          {visitsToRewardCopy(stampsLeft, title)}
        </Text>
      ) : null}

      <GradientOutlineButton label={isReady ? 'Claim in store' : 'View progress'} />
    </GradientCard>
  )

  const pressableStyle = ({ pressed }: { pressed: boolean }) => [transparent, { opacity: pressed ? 0.97 : 1 }]

  if (isReady) {
    return (
      <Link href={{ pathname: '/claim/[unlockId]', params: { unlockId: String(slide.item.unlock_id) } }} asChild>
        <Pressable style={pressableStyle} android_ripple={{ color: 'rgba(15, 23, 42, 0.08)' }}>
          {card}
        </Pressable>
      </Link>
    )
  }

  return (
    <Link
      href={{
        pathname: '/card/[cardId]',
        params: { cardId: String(slide.card.id), venueId: String(slide.card.venue_id) },
      }}
      asChild
    >
      <Pressable style={pressableStyle} android_ripple={{ color: 'rgba(15, 23, 42, 0.08)' }}>
        {card}
      </Pressable>
    </Link>
  )
}

export default function HomeRewardCarousel({ slides }: HomeRewardCarouselProps) {
  const { width: screenWidth } = useWindowDimensions()

  const cardWidth = screenWidth - space.screenX * 2 - carousel.rewardCardPeek
  const snapInterval = cardWidth + carousel.rewardCardGap

  if (!slides.length) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={snapInterval}
      snapToAlignment="start"
      disableIntervalMomentum
      nestedScrollEnabled
      directionalLockEnabled
      scrollEventThrottle={16}
      style={transparent}
      contentContainerStyle={{
        paddingLeft: space.screenX,
        paddingRight: space.screenX,
        backgroundColor: 'transparent',
      }}
    >
        {slides.map((item, index) => (
          <View
            key={item.id}
            style={[
              transparent,
              {
                width: cardWidth,
                marginRight: index < slides.length - 1 ? carousel.rewardCardGap : 0,
              },
            ]}
          >
            <RewardCarouselCard slide={item} width={cardWidth} />
          </View>
        ))}
    </ScrollView>
  )
}
