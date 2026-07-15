import { TextInput, type TextInputProps, type TextStyle } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows } from '../../theme'

export type AppTextInputProps = TextInputProps & {
  compact?: boolean
}

const baseStyle: TextStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.image,
  paddingHorizontal: 16,
  paddingVertical: 14,
  backgroundColor: colors.surface,
  fontSize: 16,
  color: colors.ink,
  ...shadows.sm,
}

export default function AppTextInput({ style, compact, placeholderTextColor, ...props }: AppTextInputProps) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? colors.inkSoft}
      style={withAppFont({
        ...baseStyle,
        ...(compact ? { paddingVertical: 12 } : null),
        ...(style as TextStyle),
      })}
      {...props}
    />
  )
}
