import { Link, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { apiRequest } from '../src/lib/api'
import { venueCoverUrl } from '../src/lib/media'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'
import type { WalletCard } from '../src/types/loyalty'

interface DiscoverVenue {
  id: number
  name: string
  slug: string
  cover_image?: string | null
  category?: string | null
  joined_count?: number
  rewards_count?: number
}

export default function VenuesScreen() {
  const insets = useSafeAreaInsets()
  const refreshInsetTop = insets.top + 12
  const { token, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null)
  const [venues, setVenues] = useState<DiscoverVenue[]>([])
  const [cardsByVenue, setCardsByVenue] = useState<Record<number, WalletCard>>({})
  const [search, setSearch] = useState('')
  const fade = useRef(new Animated.Value(0)).current

  async function load(isRefresh = false) {
    if (!token) return
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')
    try {
      const [discoverResponse, cardsResponse] = await Promise.all([
        apiRequest<{ venues: DiscoverVenue[] }>('/venues/discover', { token }),
        apiRequest<{ cards: WalletCard[] }>('/customer/cards', { token }).catch(() => ({ cards: [] })),
      ])
      setVenues(discoverResponse.venues)
      const map: Record<number, WalletCard> = {}
      for (const card of cardsResponse.cards) {
        map[card.venue_id] = card
      }
      setCardsByVenue(map)
    } catch {
      setError('Could not load venues.')
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [token]),
  )

  useEffect(() => {
    if (loading) return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start()
  }, [fade, loading])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return venues
    return venues.filter((venue) => {
      const haystack = [venue.name, venue.category, venue.slug].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [search, venues])

  async function joinVenue(slug: string) {
    if (!token) return
    setJoiningSlug(slug)
    try {
      await apiRequest(`/venues/${slug}/join`, { method: 'POST', token })
      await load()
    } catch {
      setError('Could not join venue.')
    } finally {
      setJoiningSlug(null)
    }
  }

  if (role !== 'customer') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: space.screenX, backgroundColor: colors.bg }}>
        <Text style={typography.section}>Customer venues only</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentInset={{ top: refreshInsetTop }}
      contentOffset={{ x: 0, y: -refreshInsetTop }}
      refreshControl={<RefreshControl refreshing={refreshing} progressViewOffset={refreshInsetTop + 56} onRefresh={() => void load(true)} tintColor={colors.primary} />}
      contentContainerStyle={{
        paddingTop: 12,
        paddingBottom: insets.bottom + 28,
        paddingHorizontal: space.screenX,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View style={{ opacity: fade }}>
        <Text style={typography.hero}>Discover</Text>
        <Text style={{ ...typography.body, marginTop: 4 }}>Find your next favorite reward spot.</Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search venues"
          placeholderTextColor={colors.inkSoft}
          style={{
            marginTop: 18,
            backgroundColor: colors.surface,
            borderRadius: radius.image,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.ink,
          }}
        />

        {error ? <Text style={{ color: colors.danger, marginTop: 10 }}>{error}</Text> : null}

        <View style={{ marginTop: space.sectionY, gap: 16 }}>
          {filtered.map((item) => {
            const joined = (item.joined_count ?? 0) > 0
            const cover = venueCoverUrl(item)
            const offer =
              (item.rewards_count ?? 0) > 0
                ? 'Collect 10 stamps → Unlock Free Coffee'
                : 'Join to unlock rewards'

            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.card,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {cover ? (
                  <Image source={{ uri: cover }} style={{ width: '100%', height: 150 }} resizeMode="cover" />
                ) : (
                  <View style={{ height: 150, backgroundColor: colors.surfaceMuted }} />
                )}
                <View style={{ padding: space.cardPad }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{item.name}</Text>
                      <View style={{ marginTop: 6, flexDirection: 'row', gap: 8 }}>
                        {item.category ? (
                          <View style={{ backgroundColor: colors.lavender, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ ...typography.caption, color: colors.primary, textTransform: 'capitalize' }}>
                              {item.category}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{ backgroundColor: colors.lavender, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ ...typography.caption, color: colors.primary }}>Nearby</Text>
                        </View>
                      </View>
                    </View>
                    {joined ? (
                      <View
                        style={{
                          backgroundColor: colors.successBg,
                          borderRadius: radius.button,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderWidth: 1,
                          borderColor: colors.successBorder,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.success }}>Joined</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ ...typography.body, marginTop: 10, color: colors.plum, fontWeight: '600' }}>{offer}</Text>
                  {joined ? (
                    <Link
                      href={
                        cardsByVenue[item.id]
                          ? {
                              pathname: '/card/[cardId]',
                              params: {
                                cardId: String(cardsByVenue[item.id].id),
                                venueId: String(item.id),
                              },
                            }
                          : '/(customer)/wallet'
                      }
                      asChild
                    >
                      <Pressable
                        style={{
                          marginTop: 14,
                          backgroundColor: colors.primary,
                          borderRadius: radius.button,
                          paddingVertical: 12,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: colors.primaryText, fontWeight: '800' }}>Continue collecting</Text>
                      </Pressable>
                    </Link>
                  ) : (
                    <Pressable
                      onPress={() => void joinVenue(item.slug)}
                      disabled={joiningSlug === item.slug}
                      style={{
                        marginTop: 14,
                        backgroundColor: colors.primary,
                        borderRadius: radius.button,
                        paddingVertical: 12,
                        alignItems: 'center',
                        opacity: joiningSlug === item.slug ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: colors.primaryText, fontWeight: '800' }}>
                        {joiningSlug === item.slug ? 'Joining…' : 'Join'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {!filtered.length ? (
          <Text style={{ ...typography.body, marginTop: 20, textAlign: 'center' }}>No venues match your search.</Text>
        ) : null}
      </Animated.View>
    </ScrollView>
  )
}
