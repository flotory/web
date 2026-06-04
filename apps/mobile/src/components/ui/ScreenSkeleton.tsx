import { View } from 'react-native'

import { radius, space } from '../../theme'
import SkeletonBlock from './SkeletonBlock'

interface ScreenSkeletonProps {
  topInset: number
  withSearch?: boolean
  cardCount?: number
  /** Compact horizontal venue rows (discover list). */
  listCard?: boolean
}

export default function ScreenSkeleton({ topInset, withSearch = false, cardCount = 2, listCard = false }: ScreenSkeletonProps) {
  return (
    <View style={{ flex: 1, paddingTop: topInset + 12, paddingHorizontal: space.screenX }}>
      <SkeletonBlock height={14} width={110} borderRadius={7} />
      <View style={{ marginTop: 10 }}>
        <SkeletonBlock height={38} width="70%" borderRadius={12} />
      </View>
      <View style={{ marginTop: 8 }}>
        <SkeletonBlock height={20} width="82%" borderRadius={10} />
      </View>

      {withSearch ? (
        <View style={{ marginTop: 18 }}>
          <SkeletonBlock height={48} borderRadius={radius.image} />
        </View>
      ) : null}

      <View style={{ marginTop: 20, gap: 14 }}>
        {Array.from({ length: cardCount }).map((_, index) => (
          <View key={index}>
            <SkeletonBlock height={listCard ? 124 : 224} borderRadius={radius.card} />
          </View>
        ))}
      </View>
    </View>
  )
}
