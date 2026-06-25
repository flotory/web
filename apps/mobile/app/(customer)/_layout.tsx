import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'
import { ActivityIndicator, Animated, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import CustomerStampOrchestrator from '../../src/components/customer/CustomerStampOrchestrator'
import CustomerTabBar from '../../src/components/navigation/CustomerTabBar'
import GuestRouteGuard from '../../src/components/navigation/GuestRouteGuard'
import { hapticTabChange } from '../../src/lib/haptics'
import { withAppFont } from '../../src/lib/typography'
import { useAuth } from '../../src/providers/AuthProvider'
import { NfcStampScanProvider, useNfcStampScanAction } from '../../src/providers/NfcStampScanProvider'
import { colors, shadows } from '../../src/theme'

function NfcStampingOverlay() {
  const { scanning } = useNfcStampScanAction()
  const insets = useSafeAreaInsets()
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-8)).current

  useEffect(() => {
    if (scanning) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 120, useNativeDriver: true }),
      ]).start()
      return
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -8, duration: 150, useNativeDriver: true }),
    ]).start()
  }, [opacity, scanning, translateY])

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 6,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 120,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: 'rgba(5, 13, 30, 0.96)',
          borderWidth: 1,
          borderColor: 'rgba(215, 163, 93, 0.42)',
          ...shadows.md,
        }}
      >
        <Ionicons name="scan-outline" size={16} color={colors.accent} />
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={withAppFont({ fontSize: 14, fontWeight: '800', color: colors.primaryText })}>Stamping...</Text>
      </View>
    </Animated.View>
  )
}

function GuestStampOrchestrator() {
  return null
}

export default function CustomerTabsLayout() {
  const { token, role } = useAuth()
  const isGuest = !token

  if (token && role === null) {
    return null
  }

  if (token && role === 'owner') {
    return <Redirect href="/owner-dashboard" />
  }

  if (token && role !== 'customer') {
    return <Redirect href="/" />
  }

  return (
    <NfcStampScanProvider>
      <View style={{ flex: 1 }}>
        {isGuest ? <GuestRouteGuard /> : null}
        <Tabs
          tabBar={(props) => <CustomerTabBar {...props} guestMode={isGuest} />}
          screenListeners={{
            tabPress: () => {
              hapticTabChange()
            },
          }}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.ink,
            tabBarInactiveTintColor: colors.inkSoft,
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: 'Home',
              href: isGuest ? null : undefined,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="wallet"
            options={{
              title: 'Wallet',
              href: isGuest ? null : undefined,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? 'wallet' : 'wallet-outline'} color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="qr"
            options={{
              title: 'Stamp',
              href: isGuest ? null : undefined,
              tabBarLabel: () => null,
            }}
          />
          <Tabs.Screen
            name="venues"
            options={{
              title: 'Venues',
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? 'location' : 'location-outline'} color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: isGuest ? 'Sign in' : 'Profile',
              href: isGuest ? null : undefined,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={isGuest ? (focused ? 'log-in' : 'log-in-outline') : focused ? 'person' : 'person-outline'}
                  color={color}
                  size={size}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              title: 'Notifications',
              href: null,
            }}
          />
        </Tabs>
        {isGuest ? <GuestStampOrchestrator /> : <CustomerStampOrchestrator />}
        {!isGuest ? <NfcStampingOverlay /> : null}
      </View>
    </NfcStampScanProvider>
  )
}
