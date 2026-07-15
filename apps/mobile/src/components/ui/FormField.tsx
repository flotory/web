import { Text, View, type ViewStyle } from 'react-native'

import AppTextInput, { type AppTextInputProps } from './AppTextInput'
import { withAppFont } from '../../lib/typography'
import { colors } from '../../theme'

interface FormFieldProps extends AppTextInputProps {
  label?: string
  error?: string
  success?: string
  containerStyle?: ViewStyle
}

export default function FormField({
  label,
  error,
  success,
  containerStyle,
  ...inputProps
}: FormFieldProps) {
  const message = error ?? success
  const messageColor = error ? colors.danger : colors.successText

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.inkMuted, marginBottom: 6 })}>
          {label}
        </Text>
      ) : null}
      <AppTextInput {...inputProps} />
      {message ? (
        <Text style={withAppFont({ marginTop: 8, fontSize: 14, fontWeight: '600', color: messageColor })}>{message}</Text>
      ) : null}
    </View>
  )
}
