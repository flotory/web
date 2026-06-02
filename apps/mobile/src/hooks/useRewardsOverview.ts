import { useCallback } from 'react'

import { fetchRewardsOverview } from '../lib/customerData'
import { useAuth } from '../providers/AuthProvider'
import { useScreenResource } from './useScreenResource'

export function useRewardsOverview() {
  const { token } = useAuth()

  const load = useCallback(
    (fresh: boolean) => {
      if (!token) return Promise.reject(new Error('missing token'))
      return fetchRewardsOverview(token, fresh)
    },
    [token],
  )

  return useScreenResource({
    enabled: Boolean(token),
    refetchOnFocus: true,
    errorMessage: 'Could not load rewards.',
    load,
  })
}
