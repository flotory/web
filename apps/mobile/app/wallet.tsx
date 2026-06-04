import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Animated, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import WalletStackedCards from '../src/components/customer/WalletStackedCards'
import CustomerScreen, { CustomerScreenLoading } from '../src/components/ui/CustomerScreen'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import ScreenSkeleton from '../src/components/ui/ScreenSkeleton'
import StateCard from '../src/components/ui/StateCard'
import { useCustomerCards } from '../src/hooks/useCustomerCards'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import { colors, radius, space } from '../src/theme'

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
      <ScreenHeader title="Wallet" subtitle="Your loyalty cards at each venue." />
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
          <WalletStackedCards
            cards={filtered}
            refreshing={refreshing}
            onRefresh={refresh}
            bottomInset={insets.bottom}
            emptySearch={filtered.length === 0 && cardList.length > 0}
            onClearSearch={() => setSearch('')}
          />
        </Animated.View>
      ) : null}
    </CustomerScreen>
  )
}
