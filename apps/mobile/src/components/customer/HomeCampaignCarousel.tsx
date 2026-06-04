import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'

import { colors, carousel, radius, space, type as typography } from '../../theme'
import type { HomeCampaign } from '../../types/loyalty'

interface HomeCampaignCarouselProps {
  campaigns: HomeCampaign[]
}

const transparent = { backgroundColor: 'transparent' as const }

function CampaignCard({ campaign, width }: { campaign: HomeCampaign; width: number }) {
  const daysLabel =
    campaign.days_left != null && campaign.days_left >= 0
      ? `${campaign.days_left} day${campaign.days_left === 1 ? '' : 's'} left`
      : null

  return (
    <Link
      href={{
        pathname: '/card/[cardId]',
        params: { cardId: String(campaign.card_id), venueId: String(campaign.venue_id) },
      }}
      asChild
    >
      <Pressable
        style={({ pressed }) => [
          {
            width,
            opacity: pressed ? 0.94 : 1,
            backgroundColor: colors.plum,
            borderRadius: radius.card,
            padding: space.cardPad,
            borderWidth: 1,
            borderColor: campaign.applies_now ? colors.lavenderBorder : colors.primarySoft,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.lavenderBorder, letterSpacing: 0.4 }}>
              {campaign.venue_name}
            </Text>
            <Text style={{ marginTop: 6, fontSize: 20, fontWeight: '900', color: colors.primaryText, lineHeight: 26 }}>
              {campaign.headline}
            </Text>
          </View>
          <View
            style={{
              minWidth: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primaryText }}>{campaign.multiplier}×</Text>
          </View>
        </View>
        <Text style={{ marginTop: 10, fontSize: 14, lineHeight: 20, color: 'rgba(248,250,252,0.88)' }} numberOfLines={3}>
          {campaign.message}
        </Text>
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryText }}>
              {campaign.applies_now ? 'Active for you' : 'View details'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primaryText} />
          </View>
          {daysLabel ? (
            <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(248,250,252,0.7)' }}>{daysLabel}</Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  )
}

export default function HomeCampaignCarousel({ campaigns }: HomeCampaignCarouselProps) {
  const { width: screenWidth } = useWindowDimensions()

  if (!campaigns.length) return null

  const cardWidth = Math.floor((screenWidth - space.screenX) / carousel.campaignVisibleCount)
  const snapInterval = cardWidth + carousel.campaignCardGap

  return (
    <View>
      <Text style={{ ...typography.section, paddingHorizontal: space.screenX }}>Active promotions</Text>
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
        style={[transparent, { marginTop: 12 }]}
        contentContainerStyle={{
          paddingLeft: space.screenX,
          paddingRight: space.screenX,
        }}
      >
        {campaigns.map((campaign, index) => (
          <View
            key={`${campaign.venue_id}-${campaign.campaign_id}`}
            style={{
              width: cardWidth,
              marginRight: index < campaigns.length - 1 ? carousel.campaignCardGap : 0,
            }}
          >
            <CampaignCard campaign={campaign} width={cardWidth} />
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
