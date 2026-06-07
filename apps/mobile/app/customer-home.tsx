import { Animated, Text, View } from 'react-native'

import HomeCampaignCarousel from '../src/components/customer/HomeCampaignCarousel'
import HomeQuickActions from '../src/components/customer/HomeQuickActions'
import HomeRewardCarousel from '../src/components/customer/HomeRewardCarousel'
import HomeRewardTicketCard from '../src/components/customer/HomeRewardTicketCard'
import AnimatedSection from '../src/components/ui/AnimatedSection'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import HomeScreenHeader from '../src/components/ui/HomeScreenHeader'
import StateCard from '../src/components/ui/StateCard'
import { useCustomerHome } from '../src/hooks/useCustomerHome'
import { hapticLightTap } from '../src/lib/haptics'
import { rewardImageUrl } from '../src/lib/media'
import { heroProgressSubtitle, heroProgressTitle } from '../src/lib/progressCopy'
import { colors, space, type as typography } from '../src/theme'
import { withAppFont } from '../src/lib/typography'

export default function CustomerHomeScreen() {
  const {
    role,
    router,
    firstName,
    loading,
    refreshing,
    error,
    cards,
    homeCampaigns,
    campaignVenueById,
    readyItems,
    primaryReady,
    featuredNextCard,
    rewardSlides,
    headerStampsLeft,
    headerRewardTitle,
    quickActions,
    activity,
    fade,
    refresh,
    reload,
    silentRefreshWallet,
  } = useCustomerHome()

  if (role !== 'customer') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: space.screenX, backgroundColor: colors.bg }}>
        <Text style={typography.section}>Customer home only</Text>
      </View>
    )
  }

  const header = (
    <Animated.View style={{ opacity: fade }}>
      <View style={{ paddingHorizontal: space.screenX }}>
        <HomeScreenHeader
          pretitle={`Hi, ${firstName}`}
          title={headerStampsLeft > 0 ? heroProgressTitle(headerStampsLeft, headerRewardTitle) : undefined}
          subtitle={headerStampsLeft > 0 ? heroProgressSubtitle(headerStampsLeft, headerRewardTitle) : undefined}
          onNotificationsPress={() => {
            hapticLightTap()
            router.push('/(customer)/notifications')
          }}
        />
      </View>
    </Animated.View>
  )

  const hasHeroReady = Boolean(primaryReady)
  const hasFeaturedNext = Boolean(featuredNextCard)
  const hasCarousel = rewardSlides.length > 0

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
              title: 'Could not load home',
              message: 'Pull to refresh or try again in a moment.',
              primaryLabel: 'Try again',
              onPrimary: reload,
              secondaryLabel: 'Open wallet',
              onSecondary: () => router.push('/(customer)/wallet'),
            }
          : undefined
      }
    >
      {!error ? (
        <Animated.View style={{ opacity: fade }}>
          {hasHeroReady ? (
            <View style={{ marginTop: space.sectionGap, paddingHorizontal: space.screenX }}>
              <HomeRewardTicketCard
                variant="ready"
                title={primaryReady!.reward.title}
                venue={primaryReady!.customer.venue}
                imageUri={rewardImageUrl(primaryReady!.reward)}
                unlockId={primaryReady!.unlock_id}
                onClaimUnavailable={() => void silentRefreshWallet()}
              />
            </View>
          ) : hasFeaturedNext ? (
            <View style={{ marginTop: space.sectionGap, paddingHorizontal: space.screenX }}>
              <HomeRewardTicketCard
                variant="next"
                title={featuredNextCard!.summary?.next_reward_title ?? 'Your next reward'}
                venue={featuredNextCard!.venue}
                imageUri={rewardImageUrl({
                  title: featuredNextCard!.summary?.next_reward_title ?? 'Reward',
                  image: null,
                  image_thumb: null,
                })}
                stampsToGo={featuredNextCard!.summary?.stamps_to_next ?? null}
                stampProgress={{
                  collected: featuredNextCard!.summary?.stamps ?? featuredNextCard!.stamps,
                  target:
                    featuredNextCard!.summary?.next_reward_stamps ??
                    featuredNextCard!.summary?.max_stamps ??
                    10,
                }}
                cardId={featuredNextCard!.id}
                venueId={featuredNextCard!.venue_id}
              />
            </View>
          ) : cards.length === 0 ? (
            <AnimatedSection style={{ marginTop: space.sectionGap, paddingHorizontal: space.screenX }}>
              <StateCard
                emoji="☕"
                title="Start your first card"
                message="Discover a venue nearby and begin collecting visits toward your first reward."
                primaryAction={{ label: 'Find a venue', onPress: () => router.push('/(customer)/venues') }}
              />
            </AnimatedSection>
          ) : null}

          {homeCampaigns.length > 0 ? (
            <View
              style={{
                marginTop: hasHeroReady || hasFeaturedNext || cards.length === 0 ? space.sectionY : space.sectionGap,
              }}
            >
              <HomeCampaignCarousel campaigns={homeCampaigns} venueById={campaignVenueById} />
            </View>
          ) : null}

          <View
            style={{
              marginTop:
                homeCampaigns.length > 0 || hasHeroReady || hasFeaturedNext || cards.length === 0
                  ? space.sectionY
                  : space.sectionGap,
            }}
          >
            <HomeQuickActions actions={quickActions} />
          </View>

          {hasCarousel ? (
            <View style={{ marginTop: space.sectionY }}>
              <Text style={{ ...typography.section, paddingHorizontal: space.screenX, marginBottom: 12 }}>
                {readyItems.length > 0 ? 'More ready to claim' : 'Keep collecting'}
              </Text>
              <HomeRewardCarousel slides={rewardSlides} onClaimUnavailable={() => void silentRefreshWallet()} />
            </View>
          ) : null}

          {activity.length > 0 ? (
            <View style={{ marginTop: space.sectionY, paddingHorizontal: space.screenX }}>
              <Text style={typography.section}>Recent activity</Text>
              <View style={{ marginTop: 14, gap: 12 }}>
                {activity.map((row) => (
                  <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Text style={withAppFont({ flex: 1, fontSize: 16, color: colors.ink, fontWeight: '500' })}>{row.label}</Text>
                    <Text style={typography.caption}>{row.time}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </CustomerScreen>
  )
}
