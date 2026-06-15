import { useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Animated, Text, View } from 'react-native'

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
import { useAuth } from '../src/providers/AuthProvider'
import { space, type as typography } from '../src/theme'

const KNOWN_CATEGORIES = new Set(['cafe', 'restaurant', 'bar', 'bakery'])

function matchesCategoryFilter(venue: DiscoverVenue, filter: DiscoverCategoryFilter): boolean {
  const category = (venue.category ?? '').toLowerCase()
  switch (filter) {
    case 'all':
      return true
    case 'coffee':
      return category === 'cafe'
    case 'food':
      return category === 'restaurant' || category === 'bar'
    case 'desserts':
      return category === 'bakery'
    case 'more':
      return !category || !KNOWN_CATEGORIES.has(category)
    default:
      return true
  }
}

function resultsLabel(count: number, hasFilters: boolean): string {
  if (count === 0) {
    return hasFilters ? 'No matches' : 'No venues yet'
  }
  if (count === 1) {
    return '1 venue'
  }
  return `${count} venues`
}

export default function VenuesScreen() {
  const router = useRouter()
  const { role } = useAuth()
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

    return sortDiscoverVenuesByNearestLocation(matches, coords)
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

  if (role !== 'customer') {
    return null
  }

  const header = (
    <Animated.View style={{ opacity: fade, paddingHorizontal: space.screenX }}>
      <Text style={typography.label}>Explore</Text>
      <Text style={{ ...typography.hero, marginTop: 6, fontSize: 30, lineHeight: 36 }}>Venues</Text>
      <Text style={{ ...typography.body, marginTop: 8, fontSize: 15 }}>
        Find places nearby, join their loyalty cards, and collect stamps with NFC.
      </Text>
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
              title: 'Could not load venues',
              message: 'Check your connection and try again.',
              primaryLabel: 'Try again',
              onPrimary: reload,
              secondaryLabel: 'Open wallet',
              onSecondary: () => router.push('/(customer)/wallet'),
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
              title={resultsLabel(filtered.length, hasActiveFilters)}
              label="Nearby"
              trailing={
                hasActiveFilters ? 'Filtered' : sortedByDistance ? 'Nearest first' : undefined
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
                title="No venues found"
                message="Try another search or category, or browse all venues."
                primaryAction={{
                  label: 'Clear filters',
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
