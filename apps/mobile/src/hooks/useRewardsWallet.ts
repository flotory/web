import { useCallback } from 'react'

import { fetchRewardsWallet } from '../lib/customerData'
import { useAuth } from '../providers/AuthProvider'
import { useScreenResource } from './useScreenResource'

interface UseRewardsWalletOptions {
  refetchOnFocus?: boolean
}

export function useRewardsWallet(options: UseRewardsWalletOptions = {}) {
  const { token } = useAuth()

  const load = useCallback(
    (fresh: boolean) => {
      if (!token) return Promise.reject(new Error('missing token'))
      return fetchRewardsWallet(token, fresh)
    },
    [token],
  )

  return useScreenResource({
    enabled: Boolean(token),
    refetchOnFocus: options.refetchOnFocus ?? false,
    errorMessage: 'Could not load rewards.',
    load,
  })
}
