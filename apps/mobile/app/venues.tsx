import { useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import DiscoverCategoryPills, { type DiscoverCategoryFilter } from '../src/components/customer/DiscoverCategoryPills'
import DiscoverLocationBanner from '../src/components/customer/DiscoverLocationBanner'
import DiscoverSearchBar from '../src/components/customer/DiscoverSearchBar'
import DiscoverVenueCard from '../src/components/customer/DiscoverVenueCard'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import HomeSectionHeader from '../src/components/ui/HomeSectionHeader'
import ScreenSkeleton from '../src/components/ui/ScreenSkeleton'
import StateCard from '../src/components/ui/StateCard'
import { useCustomerLocation } from '../src/hooks/useCustomerLocation'
import { useDiscoverVenues } from '../src/hooks/useDiscoverVenues'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import type { DiscoverVenue } from '../src/lib/customerData'
import { collectDiscoverVenueLocations, sortDiscoverVenuesByNearestLocation } from '../src/lib/distance'
import { matchesDiscoverCategoryFilter } from '../src/lib/venueCategories'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, space, type as typography } from '../src/theme'
import { withAppFont } from '../src/lib/typography'

function matchesCategoryFilter(venue: DiscoverVenue, filter: DiscoverCategoryFilter): boolean {
  return matchesDiscoverCategoryFilter(venue.category, filter)
}

function resultsLabel(count: number, hasFilters: boolean, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (count === 0) {
    return hasFilters ? t('venues.noMatches') : t('venues.noVenues')
  }
  if (count === 1) {
    return t('venues.oneVenue')
  }
  return t('venues.manyVenues', { count })
}

export default function VenuesScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { token, role } = useAuth()
  const isGuest = !token
  const { data, loading, refreshing, error, refresh, reload } = useDiscoverVenues()
  const {
    status: locationStatus,
    coords,
    hasLocation,
    requestLocation,
    refreshLocation,
    openLocationSettings,
  } = useCustomerLocation({ autoRequest: true })
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DiscoverCategoryFilter>('all')
  const fade = useFadeOnReady(!loading)

  const venues = data?.venues ?? []
  const cardsByVenue = data?.cardsByVenue ?? {}
  const locatedVenueCount = venues.filter((venue) => collectDiscoverVenueLocations(venue).length > 0).length
  const hasActiveFilters = search.trim().length > 0 || categoryFilter !== 'all'
  const sortedByDistance = hasLocation && locatedVenueCount > 0

  const handleRefresh = useCallback(() => {
    refresh()
    void refreshLocation()
  }, [refresh, refreshLocation])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matches = venues.filter((venue) => {
      if (!matchesCategoryFilter(venue, categoryFilter)) return false
      if (!query) return true
      const haystack = [venue.name, venue.category, venue.slug, venue.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })

    return sortDiscoverVenuesByNearestLocation(matches, coords, t)
  }, [categoryFilter, coords, search, venues])

  function openVenue(venue: DiscoverVenue) {
    const joined = (venue.joined_count ?? 0) > 0
    const card = cardsByVenue[venue.id]
    if (joined && card) {
      router.push({
        pathname: '/card/[cardId]',
        params: { cardId: String(card.id), venueId: String(venue.id) },
      })
      return
    }
    router.push(`/v/${venue.slug}`)
  }

  if (role && role !== 'customer') {
    return null
  }

  const header = (
    <Animated.View style={{ opacity: fade, paddingHorizontal: space.screenX }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>{t('venues.eyebrow')}</Text>
          <Text style={{ ...typography.hero, marginTop: 6, fontSize: 30, lineHeight: 36 }}>{t('venues.title')}</Text>
          <Text style={{ ...typography.body, marginTop: 8, fontSize: 15 }}>
            {isGuest ? t('venues.guestIntro') : t('venues.customerIntro')}
          </Text>
        </View>
        {isGuest ? (
          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => ({
              marginTop: 4,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={withAppFont({ color: colors.primaryText, fontWeight: '800', fontSize: 14 })}>{t('common.signIn')}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  )

  return (
    <CustomerScreen
      loading={loading}
      error={error}
      scrollable
      tabBarInset
      refreshing={refreshing}
      onRefresh={handleRefresh}
      header={header}
      skeleton={<ScreenSkeleton topInset={0} withSearch cardCount={4} listCard />}
      errorState={
        error
          ? {
              title: t('venues.loadErrorTitle'),
              message: t('venues.loadErrorMessage'),
              primaryLabel: t('venues.tryAgain'),
              onPrimary: reload,
              secondaryLabel: isGuest ? t('common.signIn') : t('venues.openWallet'),
              onSecondary: () => router.push(isGuest ? '/login' : '/(customer)/wallet'),
            }
          : undefined
      }
    >
      {!error ? (
        <Animated.View style={{ opacity: fade, marginTop: space.sectionGap, gap: space.sectionGap }}>
          <View style={{ paddingHorizontal: space.screenX, gap: 14 }}>
            <DiscoverSearchBar value={search} onChange={setSearch} />
            <DiscoverCategoryPills value={categoryFilter} onChange={setCategoryFilter} />
            <DiscoverLocationBanner
              status={locationStatus}
              hasLocation={hasLocation}
              locatedVenueCount={locatedVenueCount}
              onRequestLocation={() => void requestLocation()}
              onOpenSettings={() => void openLocationSettings()}
            />
          </View>

          <View style={{ paddingHorizontal: space.screenX }}>
            <HomeSectionHeader
              title={resultsLabel(filtered.length, hasActiveFilters, t)}
              label={t('venues.nearby')}
              trailing={
                hasActiveFilters ? t('venues.filtered') : sortedByDistance ? t('venues.nearestFirst') : undefined
              }
            />
          </View>

          <View style={{ paddingHorizontal: space.screenX, gap: space.listGap }}>
            {filtered.map((item) => (
              <DiscoverVenueCard
                key={item.id}
                venue={{
                  ...item,
                  address: item.nearestAddress ?? item.address,
                  latitude: item.nearestLatitude ?? item.latitude,
                  longitude: item.nearestLongitude ?? item.longitude,
                }}
                nearestLocationName={item.nearestLocationName}
                card={cardsByVenue[item.id] ?? null}
                distanceLabel={item.distanceLabel}
                onPress={() => openVenue(item)}
              />
            ))}
          </View>

          {!filtered.length ? (
            <View style={{ paddingHorizontal: space.screenX, marginTop: space.sectionY }}>
              <StateCard
                emoji="🔍"
                title={t('venues.emptyTitle')}
                message={t('venues.emptyMessage')}
                primaryAction={{
                  label: t('venues.clearFilters'),
                  onPress: () => {
                    setSearch('')
                    setCategoryFilter('all')
                  },
                }}
              />
            </View>
          ) : null}

          <View style={{ height: space.sectionY }} />
        </Animated.View>
      ) : null}
    </CustomerScreen>
  )
}
