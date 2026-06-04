import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, View } from 'react-native'

import { hapticTabChange } from '../../src/lib/haptics'
import { useAuth } from '../../src/providers/AuthProvider'
import { fonts } from '../../src/lib/typography'
import { colors, screenWallpaperBaseColor, shadows, tabBarQr } from '../../src/theme'

export default function CustomerTabsLayout() {
  const { token, role } = useAuth()

  if (!token) {
    return <Redirect href="/login" />
  }

  if (role === 'staff') {
    return <Redirect href="/scanner" />
  }

  if (role === 'owner') {
    return <Redirect href="/owner-dashboard" />
  }

  if (role !== 'customer') {
    return <Redirect href="/" />
  }

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          hapticTabChange()
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopColor: 'rgba(98, 72, 48, 0.14)',
          backgroundColor: screenWallpaperBaseColor(),
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semiBold,
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          href: role === 'customer' ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          href: role === 'customer' ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'My QR',
          href: role === 'customer' ? undefined : null,
          tabBarIcon: () => (
            <View
              style={{
                width: tabBarQr.size,
                height: tabBarQr.size,
                borderRadius: tabBarQr.size / 2,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                borderWidth: 3,
                borderColor: colors.bg,
                ...shadows.md,
              }}
            >
              <Ionicons name="qr-code" size={tabBarQr.iconSize} color={colors.bg} />
            </View>
          ),
          tabBarLabel: () => null,
          tabBarButton: ({ ref: _ref, ...props }) => (
            <Pressable
              {...props}
              style={[props.style, { top: -tabBarQr.lift }]}
              accessibilityRole="button"
              accessibilityLabel="My QR"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="venues"
        options={{
          title: 'Venues',
          href: role === 'customer' ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'location' : 'location-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          href: role === 'customer' ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          href: null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'gift' : 'gift-outline'} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}
