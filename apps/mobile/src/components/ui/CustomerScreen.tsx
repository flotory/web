import { type ReactElement, type ReactNode } from 'react'
import { RefreshControl, View, type RefreshControlProps } from 'react-native'

import { colors, space } from '../../theme'
import ScreenGradientLayout, { ScreenGradientLoading } from './ScreenGradientLayout'
import ScreenSkeleton from './ScreenSkeleton'
import StateCard from './StateCard'

interface CustomerScreenErrorProps {
  title: string
  message: string
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

interface CustomerScreenProps {
  loading: boolean
  error?: string
  skeleton?: ReactNode
  errorState?: CustomerScreenErrorProps
  header?: ReactNode
  children: ReactNode
  scrollable?: boolean
  flexContent?: boolean
  tabBarInset?: boolean
  refreshing?: boolean
  onRefresh?: () => void
}

export function CustomerScreenLoading({
  skeleton = <ScreenSkeleton topInset={0} cardCount={3} />,
}: {
  skeleton?: ReactNode
}) {
  return <ScreenGradientLoading>{skeleton}</ScreenGradientLoading>
}

export function CustomerScreenError({
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: CustomerScreenErrorProps) {
  return (
    <StateCard
      emoji="⚠️"
      title={title}
      message={message}
      primaryAction={{ label: primaryLabel, onPress: onPrimary }}
      secondaryAction={secondaryLabel && onSecondary ? { label: secondaryLabel, onPress: onSecondary } : undefined}
    />
  )
}

export default function CustomerScreen({
  loading,
  error,
  skeleton,
  errorState,
  header,
  children,
  scrollable = false,
  flexContent = false,
  tabBarInset = true,
  refreshing = false,
  onRefresh,
}: CustomerScreenProps) {
  if (loading) {
    return <CustomerScreenLoading skeleton={skeleton} />
  }

  const refreshControl =
    onRefresh !== undefined
      ? (<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> as ReactElement<RefreshControlProps>)
      : undefined

  return (
    <ScreenGradientLayout
      scrollable={scrollable}
      flexContent={flexContent}
      tabBarInset={tabBarInset}
      refreshControl={refreshControl}
    >
      {header}
      {error && errorState ? (
        <View style={{ marginTop: space.headerBottom, paddingHorizontal: space.screenX }}>
          <CustomerScreenError {...errorState} />
        </View>
      ) : (
        children
      )}
    </ScreenGradientLayout>
  )
}
