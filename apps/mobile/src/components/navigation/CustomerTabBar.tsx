import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import TabBarQrButton from './TabBarQrButton'
import { buildTabBarSurfacePath } from './tabBarShape'
import { fonts } from '../../lib/typography'
import { colors, tabBar as tabBarMetrics, tabBarQr, tabBarSurface } from '../../theme'

const HIDDEN_TABS = new Set(['notifications'])

const TAB_LABELS: Record<string, string> = {
  home: 'Home',
  wallet: 'Wallet',
  qr: 'My QR',
  venues: 'Venues',
  settings: 'Profile',
}

function tabIcon(name: string, focused: boolean, color: string, size: number) {
  const icons: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
    home: { on: 'home', off: 'home-outline' },
    wallet: { on: 'wallet', off: 'wallet-outline' },
    venues: { on: 'location', off: 'location-outline' },
    settings: { on: 'person', off: 'person-outline' },
  }
  const pair = icons[name]
  if (!pair) return null
  return <Ionicons name={focused ? pair.on : pair.off} size={size} color={color} />
}

export default function CustomerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const barHeight = tabBarMetrics.height + insets.bottom
  const surfacePath = buildTabBarSurfacePath(width, barHeight, {
    cornerRadius: 18,
    notchWidth: 78,
    notchDepth: 16,
  })

  const visibleRoutes = state.routes.filter((route) => !HIDDEN_TABS.has(route.name))

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        ...(Platform.OS === 'ios'
          ? {
              shadowColor: tabBarSurface.shadow.color,
              shadowOpacity: tabBarSurface.shadow.opacity,
              shadowRadius: tabBarSurface.shadow.radius,
              shadowOffset: { width: 0, height: tabBarSurface.shadow.offsetY },
            }
          : { elevation: tabBarSurface.shadow.elevation }),
      }}
    >
      <View style={{ height: barHeight, paddingBottom: insets.bottom }}>
        <Svg
          width={width}
          height={barHeight}
          style={{ position: 'absolute', left: 0, top: 0 }}
          pointerEvents="none"
        >
          <Path
            d={surfacePath}
            fill={tabBarSurface.fill}
            stroke={tabBarSurface.border}
            strokeWidth={1}
          />
        </Svg>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            height: '100%',
            paddingTop: 4,
            paddingHorizontal: 4,
          }}
        >
          {visibleRoutes.map((route) => {
            const descriptor = descriptors[route.key]
            if (!descriptor) return null

            const { options } = descriptor
            const index = state.routes.findIndex((item) => item.key === route.key)
            const focused = state.index === index
            const isQr = route.name === 'qr'
            const label = TAB_LABELS[route.name] ?? options.title ?? route.name
            const tint = focused ? colors.ink : colors.inkSoft

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params)
              }
            }

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key })
            }

            return (
              <Pressable
                key={route.key}
                testID={`tab-${route.name}`}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
                onPress={onPress}
                onLongPress={onLongPress}
                style={{
                  flex: isQr ? 1.15 : 1,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingBottom: isQr ? 0 : 4,
                  top: isQr ? -tabBarQr.lift : 0,
                }}
              >
                {isQr ? (
                  <TabBarQrButton focused={focused} />
                ) : (
                  <>
                    {options.tabBarIcon?.({
                      focused,
                      color: tint,
                      size: tabBarMetrics.iconSize,
                    }) ?? tabIcon(route.name, focused, tint, tabBarMetrics.iconSize)}
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: tabBarMetrics.labelSize,
                        fontWeight: '600',
                        fontFamily: fonts.semiBold,
                        color: tint,
                      }}
                    >
                      {String(label)}
                    </Text>
                  </>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}
