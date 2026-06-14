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

import ScreenStickerBackground from './ScreenStickerBackground'
import { colors, space, screenWallpaperBaseColor, tabBar } from '../../theme'

/** Customer tab bar height from `(customer)/_layout.tsx` */
const TAB_BAR_HEIGHT = tabBar.height

interface ScreenGradientLayoutProps {
  children: ReactNode
  /** Wrap content in ScrollView; wallpaper grows with scroll height */
  scrollable?: boolean
  /** Pinned above the scroll body — stays put during pull-to-refresh */
  fixedHeader?: ReactNode
  refreshControl?: ReactElement<RefreshControlProps>
  contentContainerStyle?: StyleProp<ViewStyle>
  tabBarInset?: boolean
  flexContent?: boolean
  paddingTop?: number
}

function ScreenWallpaper({ minHeight }: { minHeight: number }) {
  return <ScreenStickerBackground minHeight={minHeight} />
}

export function ScreenGradientLoading({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  return (
    <View style={styles.root}>
      <ScreenWallpaper minHeight={windowHeight} />
      <View style={{ flex: 1, paddingTop: insets.top + 12 }}>{children}</View>
    </View>
  )
}

export default function ScreenGradientLayout({
  children,
  scrollable = false,
  fixedHeader,
  refreshControl,
  contentContainerStyle,
  tabBarInset = true,
  flexContent = false,
  paddingTop,
}: ScreenGradientLayoutProps) {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  const topPad = paddingTop ?? insets.top + 12
  const bottomPad = insets.bottom + (tabBarInset ? TAB_BAR_HEIGHT + tabBar.scrollBottomPad : 0)

  const contentShell: ViewStyle = {
    flexGrow: 1,
    minHeight: windowHeight,
    paddingTop: topPad,
    paddingBottom: bottomPad,
    backgroundColor: 'transparent',
  }

  if (fixedHeader && (scrollable || flexContent)) {
    const body = scrollable ? (
      <ScrollView
        style={styles.transparentScroll}
        contentContainerStyle={[{ flexGrow: 1, paddingBottom: bottomPad }, contentContainerStyle]}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        bounces
        directionalLockEnabled
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    ) : (
      <View style={{ flex: 1, paddingBottom: bottomPad }}>{children}</View>
    )

    return (
      <View style={styles.root}>
        <ScreenWallpaper minHeight={windowHeight} />
        <View
          style={{
            flex: 1,
            paddingTop: topPad,
            backgroundColor: 'transparent',
          }}
        >
          {fixedHeader}
          {body}
        </View>
      </View>
    )
  }

  if (scrollable) {
    const wallpaperHeight = Math.max(windowHeight * 2, 1200)

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
          <View style={{ flexGrow: 1, minHeight: windowHeight, position: 'relative' }}>
            <ScreenWallpaper minHeight={wallpaperHeight} />
            <View style={contentShell}>{children}</View>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <ScreenWallpaper minHeight={windowHeight} />
      <View
        style={[
          flexContent
            ? { flex: 1, minHeight: windowHeight, paddingTop: topPad, backgroundColor: 'transparent' }
            : { ...contentShell },
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
    backgroundColor: screenWallpaperBaseColor(),
  },
  transparentScroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
})
