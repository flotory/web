import { Ionicons } from '@expo/vector-icons'
import { Pressable, View } from 'react-native'

import AppTextInput from './AppTextInput'
import { colors, radius, shadows } from '../../theme'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onClear?: () => void
  testID?: string
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  onClear,
  testID,
}: SearchInputProps) {
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
      <AppTextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        compact
        style={{ flex: 1, borderWidth: 0, paddingHorizontal: 0, shadowOpacity: 0, elevation: 0 }}
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
