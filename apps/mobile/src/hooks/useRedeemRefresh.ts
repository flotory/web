import { useEffect } from 'react'

import { invalidateCustomerRewardCaches } from '../lib/customerData'
import { useAuth } from '../providers/AuthProvider'
import { useRealtime } from '../providers/RealtimeProvider'

interface UseRedeemRefreshOptions {
  customerId?: number | null
  enabled?: boolean
}

export function useRedeemRefresh(refresh: () => void, options: UseRedeemRefreshOptions = {}) {
  const { token } = useAuth()
  const { latestRedeem, clearLatestRedeem } = useRealtime()
  const { customerId = null, enabled = true } = options

  useEffect(() => {
    if (!enabled || !latestRedeem || !token) {
      return
    }

    if (customerId != null && latestRedeem.customer.id !== customerId) {
      return
    }

    invalidateCustomerRewardCaches(token)
    refresh()
    clearLatestRedeem()
  }, [clearLatestRedeem, customerId, enabled, latestRedeem, refresh, token])
}
