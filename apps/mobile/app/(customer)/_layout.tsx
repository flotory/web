import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, View } from 'react-native'

import { hapticTabChange } from '../../src/lib/haptics'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors } from '../../src/theme'

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
          borderTopColor: colors.border,
          backgroundColor: colors.bg,
        },
        tabBarLabelStyle: {
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
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
              }}
            >
              <Ionicons name="qr-code" size={26} color={colors.bg} />
            </View>
          ),
          tabBarLabel: () => null,
          tabBarButton: ({ ref: _ref, ...props }) => (
            <Pressable
              {...props}
              style={[props.style, { top: -8 }]}
              accessibilityRole="button"
              accessibilityLabel="My QR"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          href: role === 'customer' ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'gift' : 'gift-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="venues"
        options={{
          title: 'Discover',
          href: role === 'customer' ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} color={color} size={size} />
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
    </Tabs>
  )
}

