import { ScrollView, Text, useWindowDimensions, View } from 'react-native'

import { buildCardVenueRewardSlides, type CardVenueRewardSlide } from '../../lib/cardVenueRewardSlides'
import { rewardImageUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import type { MilestoneProgress, RewardRef, VenueRef } from '../../types/loyalty'
import { carousel, colors, space } from '../../theme'
import HomeRewardTicketCard from './HomeRewardTicketCard'

interface CardVenueRewardsCarouselProps {
  venue?: VenueRef | null
  milestones: MilestoneProgress[]
  stamps: number
  cardId: number
  venueId: number
  pendingUnlocks?: { unlock_id: number; reward: RewardRef }[]
}

const transparent = { backgroundColor: 'transparent' as const }

export function cardVenueRewardSlidesFromProps(props: CardVenueRewardsCarouselProps): CardVenueRewardSlide[] {
  return buildCardVenueRewardSlides(props.milestones, props.stamps, props.pendingUnlocks)
}

export default function CardVenueRewardsCarousel({
  venue,
  milestones,
  stamps,
  cardId,
  venueId,
  pendingUnlocks = [],
}: CardVenueRewardsCarouselProps) {
  const { width: screenWidth } = useWindowDimensions()
  const slides = buildCardVenueRewardSlides(milestones, stamps, pendingUnlocks)

  const cardWidth = screenWidth - space.screenX * 2 - carousel.rewardCardPeek
  const snapInterval = cardWidth + carousel.rewardCardGap

  if (!slides.length) {
    return null
  }

  const readyCount = slides.filter((slide) => slide.kind === 'ready').length

  return (
    <View style={{ marginTop: space.sectionGap }}>
      <Text
        style={withAppFont({
          fontSize: 18,
          fontWeight: '800',
          color: colors.ink,
          letterSpacing: -0.3,
          paddingHorizontal: space.screenX,
          marginBottom: 12,
        })}
      >
        {venue?.name ? `Rewards at ${venue.name}` : 'Venue rewards'}
      </Text>
      {readyCount > 0 ? (
        <Text
          style={withAppFont({
            fontSize: 13,
            fontWeight: '600',
            color: colors.inkMuted,
            paddingHorizontal: space.screenX,
            marginBottom: 12,
            marginTop: -4,
          })}
        >
          {readyCount === 1 ? '1 ready to claim' : `${readyCount} ready to claim`}
        </Text>
      ) : (
        <Text
          style={withAppFont({
            fontSize: 13,
            fontWeight: '600',
            color: colors.inkMuted,
            paddingHorizontal: space.screenX,
            marginBottom: 12,
            marginTop: -4,
          })}
        >
          Swipe to see what you can earn
        </Text>
      )}

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
        {slides.map((slide, index) => (
          <View
            key={slide.id}
            style={[
              transparent,
              {
                width: cardWidth,
                marginRight: index < slides.length - 1 ? carousel.rewardCardGap : 0,
              },
            ]}
          >
            {slide.kind === 'ready' ? (
              <HomeRewardTicketCard
                variant="ready"
                title={slide.milestone.title}
                venue={venue}
                imageUri={rewardImageUrl(slide.milestone)}
                unlockId={slide.unlockId}
                width={cardWidth}
                linkable
              />
            ) : (
              <HomeRewardTicketCard
                variant="next"
                title={slide.milestone.title}
                venue={venue}
                imageUri={rewardImageUrl(slide.milestone)}
                stampsToGo={slide.stampsToGo}
                cardId={cardId}
                venueId={venueId}
                width={cardWidth}
                linkable={false}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
