import { Link } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import HomeCampaignCard from './HomeCampaignCard'
import HomeSectionHeader from '../ui/HomeSectionHeader'
import { carousel, space } from '../../theme'
import type { HomeCampaign, VenueRef } from '../../types/loyalty'

interface HomeCampaignCarouselProps {
  campaigns: HomeCampaign[]
  venueById?: Map<number, VenueRef>
}

const transparent = { backgroundColor: 'transparent' as const }

function campaignCardWidth(contentWidth: number, featured: boolean): number {
  if (featured) {
    return Math.min(contentWidth - 24, Math.max(280, Math.floor(contentWidth * 0.86)))
  }
  return Math.min(contentWidth - 48, Math.max(240, Math.floor(contentWidth * 0.72)))
}

export default function HomeCampaignCarousel({ campaigns, venueById }: HomeCampaignCarouselProps) {
  const { t } = useTranslation()
  const { width: screenWidth } = useWindowDimensions()

  const contentWidth = screenWidth - space.screenX * 2

  const snapOffsets = useMemo(() => {
    const offsets: number[] = [0]
    let x = 0
    for (let index = 1; index < campaigns.length; index += 1) {
      const prevWidth = campaignCardWidth(contentWidth, index - 1 === 0)
      x += prevWidth + carousel.campaignCardGap
      offsets.push(x)
    }
    return offsets
  }, [campaigns, contentWidth])

  if (!campaigns.length) return null

  const featuredHeight = 212

  return (
    <View style={{ minHeight: featuredHeight }}>
      <View style={{ paddingHorizontal: space.screenX }}>
        <HomeSectionHeader
          title={t('home.activeCampaigns')}
          trailing={campaigns.length > 1 ? 'Swipe' : undefined}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={snapOffsets.length > 1 ? snapOffsets : undefined}
        snapToAlignment="start"
        disableIntervalMomentum
        nestedScrollEnabled
        scrollEventThrottle={16}
        style={[transparent, { marginTop: 14, flexGrow: 0 }]}
        contentContainerStyle={{
          paddingLeft: space.screenX,
          paddingRight: space.screenX + 8,
          paddingVertical: 4,
          alignItems: 'stretch',
        }}
      >
        {campaigns.map((campaign, index) => {
          const featured = index === 0
          const width = campaignCardWidth(contentWidth, featured)
          const venue = venueById?.get(campaign.venue_id) ?? null

          return (
            <View
              key={`${campaign.venue_id}-${campaign.campaign_id}`}
              style={{
                width,
                marginRight: index < campaigns.length - 1 ? carousel.campaignCardGap : 0,
              }}
            >
              <Link
                href={{
                  pathname: '/card/[cardId]',
                  params: { cardId: String(campaign.card_id), venueId: String(campaign.venue_id) },
                }}
                asChild
              >
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.97 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
                  android_ripple={{ color: featured ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.06)' }}
                >
                  <HomeCampaignCard campaign={campaign} width={width} featured={featured} venue={venue} />
                </Pressable>
              </Link>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}
