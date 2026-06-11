import { Animated, View } from 'react-native'
import { useMemo } from 'react'

import HomeActivitySection from '../src/components/customer/HomeActivitySection'
import HomeCampaignCarousel from '../src/components/customer/HomeCampaignCarousel'
import HomeEmptyHero from '../src/components/customer/HomeEmptyHero'
import HomeQuickActions from '../src/components/customer/HomeQuickActions'
import HomeReadyPassCard from '../src/components/customer/HomeReadyPassCard'
import HomeRewardCarousel from '../src/components/customer/HomeRewardCarousel'
import HomeRewardTicketCard from '../src/components/customer/HomeRewardTicketCard'
import HomeSummaryStrip from '../src/components/customer/HomeSummaryStrip'
import AnimatedSection from '../src/components/ui/AnimatedSection'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import HomeScreenHeader from '../src/components/ui/HomeScreenHeader'
import HomeSectionHeader from '../src/components/ui/HomeSectionHeader'
import { useCustomerHome } from '../src/hooks/useCustomerHome'
import { greetingForHour } from '../src/lib/greeting'
import { hapticLightTap } from '../src/lib/haptics'
import { rewardImageUrl } from '../src/lib/media'
import { heroProgressSubtitle, heroProgressTitle } from '../src/lib/progressCopy'
import { useNfcStampScanAction } from '../src/providers/NfcStampScanProvider'
import { space } from '../src/theme'

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
  } = useCustomerHome()

  const { startScan } = useNfcStampScanAction()

  const actions = useMemo(
    () =>
      quickActions.map((action) =>
        action.id === 'scan'
          ? {
              ...action,
              onPress: () => {
                hapticLightTap()
                void startScan()
              },
            }
          : action,
      ),
    [quickActions, startScan],
  )

  if (role !== 'customer') {
    return null
  }

  const headerTitle = primaryReady
    ? 'Your reward is ready'
    : headerStampsLeft > 0
      ? heroProgressTitle(headerStampsLeft, headerRewardTitle)
      : undefined

  const headerSubtitle = primaryReady
    ? `${headerRewardTitle} — tap below to redeem at the counter.`
    : headerStampsLeft > 0
      ? heroProgressSubtitle(headerStampsLeft, headerRewardTitle)
      : cards.length === 0
        ? 'Discover a cafe and start collecting visits.'
        : undefined

  const header = (
    <Animated.View style={{ opacity: fade, paddingHorizontal: space.screenX }}>
      <HomeScreenHeader
        greeting={greetingForHour()}
        name={firstName}
        title={headerTitle}
        subtitle={headerSubtitle}
        onNotificationsPress={() => {
          hapticLightTap()
          router.push('/(customer)/notifications')
        }}
      />
    </Animated.View>
  )

  const showSummaryStrip = cards.length > 0 || readyItems.length > 0

  const hasHeroReady = Boolean(primaryReady)
  const hasFeaturedNext = Boolean(featuredNextCard)
  const hasCarousel = rewardSlides.length > 0
  const showEmpty = cards.length === 0 && !hasHeroReady

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
          {showSummaryStrip ? (
            <View style={{ marginTop: space.sectionGap, paddingHorizontal: space.screenX }}>
              <HomeSummaryStrip
                cardCount={cards.length}
                readyCount={readyItems.length}
                stampsToGo={primaryReady ? null : headerStampsLeft > 0 ? headerStampsLeft : null}
              />
            </View>
          ) : null}

          {hasHeroReady ? (
            <View style={{ marginTop: space.sectionGap, paddingHorizontal: space.screenX }}>
              <HomeReadyPassCard item={primaryReady!} />
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
          ) : showEmpty ? (
            <AnimatedSection style={{ marginTop: space.sectionGap, paddingHorizontal: space.screenX }}>
              <HomeEmptyHero
                onFindVenue={() => router.push('/(customer)/venues')}
                onStamp={() => void startScan()}
              />
            </AnimatedSection>
          ) : null}

          {homeCampaigns.length > 0 ? (
            <View
              style={{
                marginTop:
                  hasHeroReady || hasFeaturedNext || showEmpty ? space.sectionY : space.sectionGap,
              }}
            >
              <HomeCampaignCarousel campaigns={homeCampaigns} venueById={campaignVenueById} />
            </View>
          ) : null}

          <View
            style={{
              marginTop:
                homeCampaigns.length > 0 || hasHeroReady || hasFeaturedNext || showEmpty
                  ? space.sectionY
                  : space.sectionGap,
            }}
          >
            <HomeQuickActions actions={actions} />
          </View>

          {hasCarousel ? (
            <View style={{ marginTop: space.sectionY, gap: 14 }}>
              <View style={{ paddingHorizontal: space.screenX }}>
                <HomeSectionHeader
                  title={readyItems.length > 0 ? 'More ready to redeem' : 'Keep collecting'}
                  label={readyItems.length > 0 ? 'Rewards' : 'Your cards'}
                  trailing={rewardSlides.length > 1 ? 'Swipe' : undefined}
                />
              </View>
              <HomeRewardCarousel slides={rewardSlides} />
            </View>
          ) : null}

          {activity.length > 0 ? (
            <View style={{ marginTop: space.sectionY }}>
              <HomeActivitySection activity={activity} />
            </View>
          ) : null}

          <View style={{ height: space.sectionY }} />
        </Animated.View>
      ) : null}
    </CustomerScreen>
  )
}
