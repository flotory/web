import type { ComponentProps } from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { ViewStyle } from 'react-native'

import AppButton from './AppButton'

interface PrimaryButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
  pulse?: boolean
  haptic?: boolean
  icon?: ComponentProps<typeof Ionicons>['name']
}

export default function PrimaryButton(props: PrimaryButtonProps) {
  return <AppButton {...props} variant="primary" />
}
