import { Ionicons } from '@expo/vector-icons'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'

import { colors, space } from '../../theme'

interface StickyBackButtonProps {
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export default function StickyBackButton({ onPress, style }: StickyBackButtonProps) {
  const { t } = useTranslation()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common.goBack')}
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.discoverCardBorder,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.ink} />
    </Pressable>
  )
}

interface StickyBackHeaderProps {
  onPress: () => void
  topInset: number
}

export function StickyBackHeader({ onPress, topInset }: StickyBackHeaderProps) {
  return (
    <View style={{ paddingTop: topInset + 4, paddingHorizontal: space.screenX, paddingBottom: 8 }}>
      <StickyBackButton onPress={onPress} />
    </View>
  )
}
