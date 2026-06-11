import { Ionicons } from '@expo/vector-icons'
import { Pressable, TextInput, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows } from '../../theme'

interface DiscoverSearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
}

export default function DiscoverSearchBar({ value, onChange, onClear }: DiscoverSearchBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.image,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        gap: 10,
        ...shadows.sm,
      }}
    >
      <Ionicons name="search" size={20} color={colors.inkMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search venues or cuisines"
        placeholderTextColor={colors.inkSoft}
        style={withAppFont({
          flex: 1,
          paddingVertical: 14,
          fontSize: 16,
          color: colors.ink,
        })}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => {
            onChange('')
            onClear?.()
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={20} color={colors.inkSoft} />
        </Pressable>
      ) : null}
    </View>
  )
}
