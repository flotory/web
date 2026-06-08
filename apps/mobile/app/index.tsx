import { Redirect } from 'expo-router'

import { useAuth } from '../src/providers/AuthProvider'

export default function IndexScreen() {
  const { token, role } = useAuth()

  if (token && role === null) {
    return null
  }

  if (!token) {
    return <Redirect href="/login" />
  }

  if (role === 'owner') {
    return <Redirect href="/owner-dashboard" />
  }
  if (role === 'staff') {
    return <Redirect href="/scanner" />
  }

  if (role === 'customer') {
    return <Redirect href="/(customer)/home" />
  }

  return <Redirect href="/(customer)/home" />
}

