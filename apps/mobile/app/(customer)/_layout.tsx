import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { View } from 'react-native'

import CustomerStampOrchestrator from '../../src/components/customer/CustomerStampOrchestrator'
import CustomerTabBar from '../../src/components/navigation/CustomerTabBar'
import { hapticTabChange } from '../../src/lib/haptics'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors } from '../../src/theme'

export default function CustomerTabsLayout() {
  const { token, role } = useAuth()

  if (token && role === null) {
    return null
  }

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
    <View style={{ flex: 1 }}>
      <Tabs
      tabBar={(props) => <CustomerTabBar {...props} />}
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
          tabBarLabel: () => null,
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
        name="notifications"
        options={{
          title: 'Notifications',
          href: null,
        }}
      />
    </Tabs>
      <CustomerStampOrchestrator />
    </View>
  )
}
