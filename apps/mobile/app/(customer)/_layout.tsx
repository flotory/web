import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

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
          title: 'Venues',
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

