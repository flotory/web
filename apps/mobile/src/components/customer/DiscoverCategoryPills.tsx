import { Pressable, ScrollView, Text } from 'react-native'
import { useTranslation } from 'react-i18next'

import { colors } from '../../theme'
import { withAppFont } from '../../lib/typography'

export type DiscoverCategoryFilter = 'all' | 'coffee' | 'food' | 'desserts' | 'more'

const PILL_IDS: DiscoverCategoryFilter[] = ['all', 'coffee', 'food', 'desserts', 'more']

interface DiscoverCategoryPillsProps {
  value: DiscoverCategoryFilter
  onChange: (value: DiscoverCategoryFilter) => void
}

export default function DiscoverCategoryPills({ value, onChange }: DiscoverCategoryPillsProps) {
  const { t } = useTranslation()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 4 }}
    >
      {PILL_IDS.map((id) => {
        const active = value === id
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
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
              {t(`venues.category_${id}`)}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
