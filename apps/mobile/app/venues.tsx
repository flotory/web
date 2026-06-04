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
import { useDiscoverVenues } from '../src/hooks/useDiscoverVenues'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import type { DiscoverVenue } from '../src/lib/customerData'
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
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DiscoverCategoryFilter>('all')
  const fade = useFadeOnReady(!loading)

  const venues = data?.venues ?? []
  const cardsByVenue = data?.cardsByVenue ?? {}

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return venues.filter((venue) => {
      if (!matchesCategoryFilter(venue, categoryFilter)) return false
      if (!query) return true
      const haystack = [venue.name, venue.category, venue.slug].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [categoryFilter, search, venues])

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

  const header = (
    <View style={{ paddingHorizontal: space.screenX }}>
      <ScreenHeader
        title="Discover venues"
        subtitle="Find places, earn rewards, enjoy more."
      />
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter venues"
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: radius.image,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.discoverPillBorder,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons name="options-outline" size={21} color={colors.inkMuted} />
        </Pressable>
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
