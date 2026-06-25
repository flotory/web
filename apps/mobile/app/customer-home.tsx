import { Redirect } from 'expo-router'
import { Animated, View } from 'react-native'
import { useMemo } from 'react'

import HomeActivitySection from '../src/components/customer/HomeActivitySection'
import HomeCampaignCarousel from '../src/components/customer/HomeCampaignCarousel'
import HomeEmptyHero from '../src/components/customer/HomeEmptyHero'
import HomeContextualCta from '../src/components/customer/HomeContextualCta'
import HomeRewardCarousel from '../src/components/customer/HomeRewardCarousel'
import HomeSummaryStrip from '../src/components/customer/HomeSummaryStrip'
import AnimatedSection from '../src/components/ui/AnimatedSection'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import HomeScreenHeader from '../src/components/ui/HomeScreenHeader'
import HomeSectionHeader from '../src/components/ui/HomeSectionHeader'
import { useCustomerHome } from '../src/hooks/useCustomerHome'
import { greetingForHour } from '../src/lib/greeting'
import { hapticLightTap } from '../src/lib/haptics'
import { useAuth } from '../src/providers/AuthProvider'
import { useNfcStampScanAction } from '../src/providers/NfcStampScanProvider'
import { space } from '../src/theme'

export default function CustomerHomeScreen() {
  const { token, booting } = useAuth()
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
    rewardSlides,
    headerStampsLeft,
    activity,
    fade,
    refresh,
    reload,
  } = useCustomerHome()

  const { startScan } = useNfcStampScanAction()

  const contextualCta = useMemo(() => {
    const showEmpty = cards.length === 0 && readyItems.length === 0

    if (showEmpty) {
      return null
    }

    if (cards.length > 0 || readyItems.length > 0) {
      return {
        label: 'Tap NFC stand',
        hint: 'Collect a stamp at the counter',
        icon: 'radio-outline' as const,
        onPress: () => {
          hapticLightTap()
          void startScan()
        },
      }
    }

    return {
      label: 'Find a venue',
      hint: 'Discover cafes near you',
      icon: 'compass-outline' as const,
      onPress: () => {
        hapticLightTap()
        router.push('/(customer)/venues')
      },
    }
  }, [cards.length, readyItems.length, router, startScan])

  if (!booting && !token) {
    return <Redirect href="/(customer)/venues" />
  }

  if (role !== 'customer') {
    return null
  }

  const hasCarousel = rewardSlides.length > 0
  const showEmpty = cards.length === 0 && readyItems.length === 0
  const showSummaryStrip = (cards.length > 0 || readyItems.length > 0) && !hasCarousel
  const readySlideCount = rewardSlides.filter((slide) => slide.kind === 'ready').length
  const progressSlideCount = rewardSlides.length - readySlideCount

  const rewardsSectionTitle =
    readySlideCount > 0 && progressSlideCount > 0
      ? 'Ready & in progress'
      : readySlideCount > 0
        ? 'Ready to redeem'
        : 'Keep collecting'

  const header = (
    <Animated.View style={{ opacity: fade, paddingHorizontal: space.screenX }}>
      <HomeScreenHeader
        greeting={greetingForHour()}
        name={firstName}
        onNotificationsPress={() => {
          hapticLightTap()
          router.push('/(customer)/notifications')
        }}
      />
    </Animated.View>
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
                stampsToGo={readyItems.length > 0 ? null : headerStampsLeft > 0 ? headerStampsLeft : null}
              />
            </View>
          ) : null}

          {hasCarousel ? (
            <View style={{ marginTop: space.sectionGap, gap: 14 }}>
              <View style={{ paddingHorizontal: space.screenX }}>
                <HomeSectionHeader
                  title={rewardsSectionTitle}
                  label="Your rewards"
                  trailing={rewardSlides.length > 1 ? 'Swipe' : undefined}
                />
              </View>
              <HomeRewardCarousel slides={rewardSlides} />
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
                marginTop: hasCarousel || showEmpty ? space.sectionY : space.sectionGap,
              }}
            >
              <HomeCampaignCarousel campaigns={homeCampaigns} venueById={campaignVenueById} />
            </View>
          ) : null}

          {contextualCta ? (
            <View
              style={{
                marginTop:
                  homeCampaigns.length > 0 || hasCarousel || showEmpty
                    ? space.sectionY
                    : space.sectionGap,
              }}
            >
              <HomeContextualCta
                label={contextualCta.label}
                hint={contextualCta.hint}
                icon={contextualCta.icon}
                onPress={contextualCta.onPress}
              />
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
