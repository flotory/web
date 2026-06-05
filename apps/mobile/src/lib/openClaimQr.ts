import type { Router } from 'expo-router'
import { Alert } from 'react-native'

import { findPendingUnlockId, invalidateCustomerRewardCaches } from './customerData'

export async function openClaimQrForUnlock(
  router: Router,
  token: string,
  unlockId: number,
  options?: { onStale?: () => void },
): Promise<boolean> {
  invalidateCustomerRewardCaches(token)

  try {
    const pending = await findPendingUnlockId(token, unlockId)
    if (pending == null) {
      options?.onStale?.()
      Alert.alert(
        'Reward already used',
        'This reward was redeemed at the café. Pull to refresh Home to see what is still available.',
      )
      return false
    }

    router.push({
      pathname: '/claim/[unlockId]',
      params: { unlockId: String(pending) },
    })
    return true
  } catch {
    Alert.alert('Could not open claim QR', 'Check your connection and try again.')
    return false
  }
}
