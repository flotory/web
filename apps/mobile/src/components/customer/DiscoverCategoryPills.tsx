import { Pressable, ScrollView, Text } from 'react-native'

import { colors } from '../../theme'
import { withAppFont } from '../../lib/typography'

export type DiscoverCategoryFilter = 'all' | 'coffee' | 'food' | 'desserts' | 'more'

const PILLS: { id: DiscoverCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'food', label: 'Food' },
  { id: 'desserts', label: 'Desserts' },
  { id: 'more', label: 'More' },
]

interface DiscoverCategoryPillsProps {
  value: DiscoverCategoryFilter
  onChange: (value: DiscoverCategoryFilter) => void
}

export default function DiscoverCategoryPills({ value, onChange }: DiscoverCategoryPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 4 }}
    >
      {PILLS.map((pill) => {
        const active = value === pill.id
        return (
          <Pressable
            key={pill.id}
            onPress={() => onChange(pill.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text
              style={withAppFont({
                fontSize: 14,
                fontWeight: '700',
                color: active ? colors.primaryText : colors.inkMuted,
              })}
            >
              {pill.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
