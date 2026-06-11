import { memo } from 'react'
import { ScrollView, useWindowDimensions, View } from 'react-native'

import { rewardImageUrl } from '../../lib/media'
import HomeRewardTicketCard from './HomeRewardTicketCard'
import { carousel, space } from '../../theme'
import type { RewardWalletItem, WalletCard } from '../../types/loyalty'

export type HomeRewardSlide =
  | { id: string; kind: 'ready'; item: RewardWalletItem }
  | { id: string; kind: 'next'; card: WalletCard }

interface HomeRewardCarouselProps {
  slides: HomeRewardSlide[]
}

const transparent = { backgroundColor: 'transparent' as const }

function HomeRewardCarousel({ slides }: HomeRewardCarouselProps) {
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
          {item.kind === 'ready' ? (
            <HomeRewardTicketCard
              variant="ready"
              title={item.item.reward.title}
              venue={item.item.customer.venue}
              imageUri={rewardImageUrl(item.item.reward)}
              unlockId={item.item.unlock_id}
              width={cardWidth}
            />
          ) : (
            <HomeRewardTicketCard
              variant="next"
              title={item.card.summary?.next_reward_title ?? 'Your next reward'}
              venue={item.card.venue}
              imageUri={rewardImageUrl({
                title: item.card.summary?.next_reward_title ?? 'Reward',
                image: null,
                image_thumb: null,
              })}
              stampsToGo={item.card.summary?.stamps_to_next ?? null}
              cardId={item.card.id}
              venueId={item.card.venue_id}
              width={cardWidth}
            />
          )}
        </View>
      ))}
    </ScrollView>
  )
}

export default memo(HomeRewardCarousel)
