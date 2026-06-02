import { LinearGradient } from 'expo-linear-gradient'
import { type ReactElement, type ReactNode } from 'react'
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, gradients, space } from '../../theme'

/** Customer tab bar height from `(customer)/_layout.tsx` */
const TAB_BAR_HEIGHT = 78

const gradientStart = { x: 0, y: 0 } as const
const gradientEnd = { x: 1, y: 1 } as const

interface ScreenGradientLayoutProps {
  children: ReactNode
  /** Wrap content in ScrollView; gradient grows with scroll height */
  scrollable?: boolean
  refreshControl?: ReactElement<RefreshControlProps>
  contentContainerStyle?: StyleProp<ViewStyle>
  tabBarInset?: boolean
  flexContent?: boolean
  paddingTop?: number
}

function ScreenGradientBackground({ minHeight }: { minHeight: number }) {
  return (
    <LinearGradient
      colors={[...gradients.screen]}
      locations={[...gradients.screenLocations]}
      start={gradientStart}
      end={gradientEnd}
      style={[StyleSheet.absoluteFillObject, { minHeight }]}
      pointerEvents="none"
    />
  )
}

export function ScreenGradientLoading({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  return (
    <View style={styles.root}>
      <ScreenGradientBackground minHeight={windowHeight} />
      <View style={{ flex: 1, paddingTop: insets.top + 12 }}>{children}</View>
    </View>
  )
}

export default function ScreenGradientLayout({
  children,
  scrollable = false,
  refreshControl,
  contentContainerStyle,
  tabBarInset = true,
  flexContent = false,
  paddingTop,
}: ScreenGradientLayoutProps) {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  const topPad = paddingTop ?? insets.top + 12
  const bottomPad = insets.bottom + (tabBarInset ? TAB_BAR_HEIGHT : 0) + space.screenX

  const gradientShell: ViewStyle = {
    flexGrow: 1,
    minHeight: windowHeight,
    paddingTop: topPad,
    paddingBottom: bottomPad,
    backgroundColor: 'transparent',
  }

  if (scrollable) {
    return (
      <View style={styles.root}>
        <ScrollView
          style={styles.transparentScroll}
          contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          directionalLockEnabled
          nestedScrollEnabled
        >
          <LinearGradient
            colors={[...gradients.screen]}
            locations={[...gradients.screenLocations]}
            start={gradientStart}
            end={gradientEnd}
            style={gradientShell}
          >
            {children}
          </LinearGradient>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <ScreenGradientBackground minHeight={windowHeight} />
      <View
        style={[
          flexContent
            ? { flex: 1, minHeight: windowHeight, paddingTop: topPad, backgroundColor: 'transparent' }
            : { ...gradientShell },
        ]}
      >
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  transparentScroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
})
