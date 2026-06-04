import { Link, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Animated, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ProgressBar from '../src/components/customer/ProgressBar'
import CustomerScreen, { CustomerScreenLoading } from '../src/components/ui/CustomerScreen'
import CoverImage from '../src/components/ui/CoverImage'
import GradientCard from '../src/components/ui/GradientCard'
import GradientOutlineButton from '../src/components/ui/GradientOutlineButton'
import PrimaryButton from '../src/components/ui/PrimaryButton'
import PressableCard from '../src/components/ui/PressableCard'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import ScreenSkeleton from '../src/components/ui/ScreenSkeleton'
import StateCard from '../src/components/ui/StateCard'
import { useCustomerCards } from '../src/hooks/useCustomerCards'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import { walletCardProgressCopy } from '../src/lib/progressCopy'
import { venueCoverUrl, venueLogoUrl } from '../src/lib/media'
import { colors, radius, space, type as typography } from '../src/theme'

const WALLET_AVATAR = 44
const WALLET_AVATAR_GAP = 10

export default function WalletScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { data: cards, loading, refreshing, error, refresh, reload } = useCustomerCards()
  const fade = useFadeOnReady(!loading)

  const cardList = cards ?? []

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return cardList
    return cardList.filter((item) => (item.venue?.name ?? '').toLowerCase().includes(query))
  }, [cardList, search])

  if (loading) {
    return (
      <CustomerScreenLoading skeleton={<ScreenSkeleton topInset={0} withSearch cardCount={3} />} />
    )
  }

  const header = (
    <View style={{ paddingHorizontal: space.screenX }}>
      <ScreenHeader title="Wallet" subtitle="Progress at each venue — show My QR when you order." />
      <PrimaryButton
        label="Show My QR"
        onPress={() => router.navigate('/(customer)/qr')}
        style={{ marginTop: 12 }}
      />
      <Pressable
        onPress={() => router.push('/(customer)/venues')}
        style={{ marginTop: 10, alignSelf: 'center', paddingVertical: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Discover venues"
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Discover venues</Text>
      </Pressable>
      {cardList.length > 0 ? (
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search venues"
          placeholderTextColor={colors.inkSoft}
          style={{
            marginTop: space.sectionGap,
            backgroundColor: colors.surface,
            borderRadius: radius.image,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: colors.ink,
            fontSize: 15,
          }}
        />
      ) : null}
    </View>
  )

  return (
    <CustomerScreen
      loading={false}
      flexContent
      tabBarInset
      header={header}
      error={error}
      errorState={
        error
          ? {
              title: 'Could not load wallet',
              message: 'Check your connection and try again.',
              primaryLabel: 'Try again',
              onPrimary: reload,
              secondaryLabel: 'Browse venues',
              onSecondary: () => router.push('/(customer)/venues'),
            }
          : undefined
      }
    >
      {!error && cardList.length === 0 ? (
        <Animated.View style={{ flex: 1, opacity: fade, justifyContent: 'center', paddingHorizontal: space.screenX }}>
          <StateCard
            emoji="💳"
            title="No cards yet"
            message="Discover venues nearby and start collecting visits toward your first reward."
            primaryAction={{ label: 'Browse venues', onPress: () => router.push('/(customer)/venues') }}
          />
        </Animated.View>
      ) : !error ? (
        <Animated.View style={{ flex: 1, opacity: fade, marginTop: space.headerBottom }}>
          <FlatList
            contentContainerStyle={{ paddingHorizontal: space.screenX, paddingBottom: insets.bottom + 18, gap: space.cardGap }}
            refreshing={refreshing}
            onRefresh={refresh}
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              <StateCard
                emoji="🔍"
                title="No matches"
                message="Try a different venue name."
                primaryAction={{ label: 'Clear search', onPress: () => setSearch('') }}
              />
            }
            renderItem={({ item }) => {
              const summary = item.summary
              const max = summary?.max_stamps ?? 10
              const stamps = summary?.stamps ?? item.stamps
              const toNext = summary?.stamps_to_next ?? Math.max(max - stamps, 0)
              const nextTitle = summary?.next_reward_title ?? 'your reward'
              const logo = venueLogoUrl(item.venue ?? undefined)
              const progress = walletCardProgressCopy(stamps, max, toNext, nextTitle)

              return (
                <Link
                  href={{
                    pathname: '/card/[cardId]',
                    params: { cardId: String(item.id), venueId: String(item.venue_id) },
                  }}
                  asChild
                >
                  <PressableCard style={{ backgroundColor: 'transparent' }}>
                    <GradientCard
                      header={<CoverImage uri={venueCoverUrl(item.venue ?? undefined)} />}
                      overlap={
                        <View
                          style={{
                            width: WALLET_AVATAR,
                            height: WALLET_AVATAR,
                            borderRadius: 12,
                            backgroundColor: colors.surfaceMuted,
                            borderWidth: 2,
                            borderColor: colors.surface,
                            overflow: 'hidden',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {logo ? (
                            <Image source={{ uri: logo }} style={{ width: WALLET_AVATAR, height: WALLET_AVATAR }} />
                          ) : (
                            <Text style={{ fontSize: 20 }}>☕</Text>
                          )}
                        </View>
                      }
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          height: WALLET_AVATAR,
                          marginBottom: space.sectionGap,
                        }}
                      >
                        <View style={{ width: WALLET_AVATAR + WALLET_AVATAR_GAP }} />
                        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: colors.plum }} numberOfLines={1}>
                          {item.venue?.name ?? 'Venue'}
                        </Text>
                      </View>
                      <ProgressBar value={stamps} max={max} />
                      <Text style={{ marginTop: 8, fontSize: 15, fontWeight: '700', color: colors.ink }}>{progress.primary}</Text>
                      <Text style={{ ...typography.caption, marginTop: 4 }}>{progress.secondary}</Text>
                      <GradientOutlineButton label="View progress" />
                    </GradientCard>
                  </PressableCard>
                </Link>
              )
            }}
          />
        </Animated.View>
      ) : null}
    </CustomerScreen>
  )
}
