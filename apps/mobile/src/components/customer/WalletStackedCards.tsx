import { RefreshControl, ScrollView, View } from 'react-native'

import WalletHeroCard from './WalletHeroCard'
import StateCard from '../ui/StateCard'
import { colors, space, tabBar, walletCard } from '../../theme'
import type { WalletCard } from '../../types/loyalty'

interface WalletStackedCardsProps {
  cards: WalletCard[]
  refreshing: boolean
  onRefresh: () => void
  bottomInset: number
  emptySearch?: boolean
  onClearSearch?: () => void
}

export default function WalletStackedCards({
  cards,
  refreshing,
  onRefresh,
  bottomInset,
  emptySearch,
  onClearSearch,
}: WalletStackedCardsProps) {
  if (emptySearch) {
    return (
      <View style={{ paddingHorizontal: space.screenX, paddingTop: space.sectionGap }}>
        <StateCard
          emoji="🔍"
          title="No matches"
          message="Try a different venue name."
          primaryAction={{ label: 'Clear search', onPress: () => onClearSearch?.() }}
        />
      </View>
    )
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{
        paddingHorizontal: space.screenX,
        paddingBottom: bottomInset + tabBar.height + tabBar.scrollBottomPad,
        paddingTop: 4,
        gap: walletCard.gap,
      }}
    >
      {cards.map((item) => (
        <WalletHeroCard key={item.id} item={item} />
      ))}
    </ScrollView>
  )
}
