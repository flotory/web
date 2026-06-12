import { useEffect } from 'react'

import { subscribeCustomerSurfaceRefresh } from '../lib/customerSurfaceRefresh'

export function useCustomerSurfaceRefresh(refresh: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    return subscribeCustomerSurfaceRefresh(refresh)
  }, [enabled, refresh])
}
