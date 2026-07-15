import type { ComponentProps } from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { ViewStyle } from 'react-native'

import AppButton from './AppButton'

interface SecondaryButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
  haptic?: boolean
  icon?: ComponentProps<typeof Ionicons>['name']
}

export default function SecondaryButton(props: SecondaryButtonProps) {
  return <AppButton {...props} variant="secondary" />
}
