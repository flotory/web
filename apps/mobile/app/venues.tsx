import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { Animated, Pressable, Text, TextInput, View } from 'react-native'

import DiscoverCategoryPills, { type DiscoverCategoryFilter } from '../src/components/customer/DiscoverCategoryPills'
import DiscoverVenueCard from '../src/components/customer/DiscoverVenueCard'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import ScreenSkeleton from '../src/components/ui/ScreenSkeleton'
import StateCard from '../src/components/ui/StateCard'
import { useCustomerLocation } from '../src/hooks/useCustomerLocation'
import { useDiscoverVenues } from '../src/hooks/useDiscoverVenues'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import type { DiscoverVenue } from '../src/lib/customerData'
import { sortVenuesByDistance } from '../src/lib/distance'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'
import { withAppFont } from '../src/lib/typography'

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

export default function VenuesScreen() {
  const router = useRouter()
  const { role } = useAuth()
  const { data, loading, refreshing, error, refresh, reload } = useDiscoverVenues()
  const { status: locationStatus, coords, hasLocation, requestLocation, refreshLocation } = useCustomerLocation()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DiscoverCategoryFilter>('all')
  const fade = useFadeOnReady(!loading)

  const venues = data?.venues ?? []
  const cardsByVenue = data?.cardsByVenue ?? {}

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

    return sortVenuesByDistance(matches, coords)
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
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: space.screenX, backgroundColor: colors.bg }}>
        <Text style={typography.section}>Customer venues only</Text>
      </View>
    )
  }

  const locationBanner = (() => {
    if (locationStatus === 'loading') {
      return (
        <View
          style={{
            marginTop: 14,
            borderRadius: radius.image,
            backgroundColor: colors.surfaceMuted,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="locate-outline" size={18} color={colors.inkMuted} />
          <Text style={withAppFont({ flex: 1, fontSize: 13, color: colors.inkMuted })}>
            Finding venues near you…
          </Text>
        </View>
      )
    }

    if (hasLocation) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh nearby venues"
          onPress={() => void refreshLocation()}
          style={({ pressed }) => ({
            marginTop: 14,
            borderRadius: radius.image,
            backgroundColor: colors.lavender,
            borderWidth: 1,
            borderColor: colors.lavenderBorder,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <Ionicons name="navigate-outline" size={18} color={colors.primarySoft} />
          <Text style={withAppFont({ flex: 1, fontSize: 13, fontWeight: '600', color: colors.primarySoft })}>
            Sorted by distance from you
          </Text>
          <Text style={withAppFont({ fontSize: 12, fontWeight: '700', color: colors.primarySoft })}>Refresh</Text>
        </Pressable>
      )
    }

    if (locationStatus === 'denied') {
      return (
        <View
          style={{
            marginTop: 14,
            borderRadius: radius.image,
            backgroundColor: colors.surfaceMuted,
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 4,
          }}
        >
          <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.ink })}>
            Location is off
          </Text>
          <Text style={withAppFont({ fontSize: 12, color: colors.inkMuted, lineHeight: 18 })}>
            Enable location in your phone settings to sort venues by distance.
          </Text>
        </View>
      )
    }

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Use location to show nearby venues"
        onPress={() => void requestLocation()}
        style={({ pressed }) => ({
          marginTop: 14,
          borderRadius: radius.image,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.discoverPillBorder,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.discoverCategoryFill,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="location-outline" size={18} color={colors.discoverCategoryIcon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.ink })}>
            Show nearby venues
          </Text>
          <Text style={withAppFont({ marginTop: 2, fontSize: 12, color: colors.inkMuted, lineHeight: 17 })}>
            We use your phone location to sort venues by distance.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
      </Pressable>
    )
  })()

  const header = (
    <View style={{ paddingHorizontal: space.screenX }}>
      <ScreenHeader
        title="Discover venues"
        subtitle="Find places, earn rewards, enjoy more."
      />
      {locationBanner}
      <View style={{ marginTop: space.sectionGap, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.discoverSearchFill,
            borderRadius: radius.image,
            borderWidth: 1,
            borderColor: colors.discoverPillBorder,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Ionicons name="search" size={19} color={colors.inkMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search venues or cuisines"
            placeholderTextColor={colors.inkSoft}
            style={withAppFont({
              flex: 1,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.ink,
            })}
          />
        </View>
      </View>
      <View style={{ marginTop: 14 }}>
        <DiscoverCategoryPills value={categoryFilter} onChange={setCategoryFilter} />
      </View>
    </View>
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
        <Animated.View
          style={{
            opacity: fade,
            marginTop: space.headerBottom,
            paddingHorizontal: space.screenX,
          }}
        >
          <View style={{ gap: space.listGap }}>
            {filtered.map((item) => (
              <DiscoverVenueCard
                key={item.id}
                venue={item}
                card={cardsByVenue[item.id] ?? null}
                distanceLabel={item.distanceLabel}
                onPress={() => openVenue(item)}
              />
            ))}
          </View>

          {!filtered.length ? (
            <View style={{ marginTop: space.sectionY }}>
              <StateCard
                emoji="🔍"
                title="No venues found"
                message="Try another search or category, or browse all venues."
                primaryAction={{ label: 'Clear filters', onPress: () => { setSearch(''); setCategoryFilter('all') } }}
              />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </CustomerScreen>
  )
}
